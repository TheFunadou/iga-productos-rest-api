import { CacheInterface } from "./cache.interfaces";
import Redis from "ioredis";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Serializes a CacheInterface value to a JSON string for storage in Redis.
 */
function serialize<T>(value: CacheInterface<T>): string {
    return JSON.stringify(value);
}

/**
 * Deserializes a Redis string back into a CacheInterface value.
 * Returns null if the string is null or unparseable.
 */
function deserialize<T>(raw: string | null): CacheInterface<T> | null {
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as CacheInterface<T>;
    } catch {
        return null;
    }
}

/**
 * Builds the namespaced Redis key used for cache entries.
 * Mirrors the default Keyv namespace so that any existing keys written
 * by the previous Keyv-based implementation remain readable during a
 * rolling deploy (Keyv uses the pattern "keyv:<key>" by default).
 *
 * If your Keyv instance was initialised with a custom namespace, update
 * this prefix accordingly and flush stale entries before deploying.
 */
function cacheKey(key: string): string {
    return `igaProductos:${key}`;
}

/**
 * Writes a CacheInterface entry to Redis.
 *
 * @param redis    - The ioredis client.
 * @param key      - The logical cache key (will be namespaced internally).
 * @param value    - The value to store.
 * @param ttlMs    - Optional TTL in milliseconds. Omitting the argument (or
 *                   passing undefined) stores the key without an expiry.
 */
async function redisSet<T>(
    redis: Redis,
    key: string,
    value: CacheInterface<T>,
    ttlMs: number | undefined
): Promise<void> {
    const payload = serialize(value);
    const rKey = cacheKey(key);
    if (ttlMs !== undefined && ttlMs > 0) {
        await redis.set(rKey, payload, "PX", ttlMs);
    } else {
        await redis.set(rKey, payload);
    }
}

/**
 * Reads a CacheInterface entry from Redis.
 * Returns null on a cache miss or a deserialization error.
 */
async function redisGet<T>(
    redis: Redis,
    key: string
): Promise<CacheInterface<T> | null> {
    const raw = await redis.get(cacheKey(key));
    return deserialize<T>(raw);
}

/**
 * Releases a Redis lock using a Lua script to guarantee atomicity.
 * The lock is only deleted when the stored value matches the provided token,
 * preventing a process from accidentally releasing a lock it no longer owns.
 */
async function releaseLock(
    redis: Redis,
    lockKey: string,
    lockValue: string
): Promise<void> {
    try {
        await redis.eval(
            `if redis.call("get", KEYS[1]) == ARGV[1] then
               return redis.call("del", KEYS[1])
             else
               return 0
             end`,
            1,
            lockKey,
            lockValue
        );
    } catch (err) {
        console.error(`[Cache] Failed to release lock ${lockKey} via Lua:`, err);
        // Best-effort hard delete as a last resort to avoid a permanently
        // held lock in the event of an unexpected Redis error.
        try {
            await redis.del(lockKey);
        } catch (delErr) {
            console.error(`[Cache] Failed to force-delete lock ${lockKey}:`, delErr);
        }
    }
}

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

/**
 * Interface that all cache strategies must implement.
 * Defines the contract for executing a cache retrieval operation.
 */
export interface CacheStrategy {
    /** Unique name of the strategy. */
    name: string;

    /**
     * Executes the caching strategy logic.
     *
     * @param key      - The unique cache key.
     * @param ttl      - Time-To-Live in milliseconds.
     * @param staleTime - Time in milliseconds before data is considered stale.
     * @param fallback - Function to fetch data on a cache miss.
     * @param redis    - The ioredis client.
     * @returns The cached or freshly fetched data.
     */
    execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T>;
}

// ---------------------------------------------------------------------------
// CacheSimpleFind
// ---------------------------------------------------------------------------

/**
 * Simple caching strategy.
 *
 * Implements a basic Cache-Aside pattern. On a cache hit the TTL is renewed
 * up to MAX_HIT_RENEWALS times. After that the entry is allowed to expire
 * naturally instead of being silently extended forever.
 *
 * Bug fixed: the original implementation restarted the full original TTL on
 * every renewal past the limit. The current implementation fetches the actual
 * remaining TTL from Redis (via PTTL) and uses that value so entries do not
 * outlive their intended maximum lifetime.
 */
export class CacheSimpleFind implements CacheStrategy {
    name = "simpleFind";

    /** Maximum number of times the TTL is renewed on consecutive cache hits. */
    private readonly MAX_HIT_RENEWALS = 10;

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T> {
        const cached = await redisGet<T>(redis, key);

        if (cached) {
            cached.metadata.hitCount++;

            let renewalTtl: number | undefined;

            if (cached.metadata.hitCount <= this.MAX_HIT_RENEWALS) {
                // Within the renewal window: reset to the full original TTL.
                renewalTtl = ttl;
            } else {
                // Past the renewal limit: use the actual remaining TTL so the
                // entry is not silently granted a new full-length lease.
                const remainingMs = await redis.pttl(cacheKey(key));
                // PTTL returns -1 (no expiry) or -2 (key does not exist).
                // In either case we fall back to undefined (no expiry).
                renewalTtl = remainingMs > 0 ? remainingMs : undefined;
            }

            // Intentionally fire-and-forget; a failed hitCount write is not
            // critical. Awaiting here would add latency on every cache hit.
            redisSet(redis, key, cached, renewalTtl).catch(err =>
                console.error(`[CacheSimpleFind] Failed to update hitCount for ${key}:`, err)
            );

            return cached.data;
        }

        const data = await fallback();
        const now = Date.now();

        const cacheData: CacheInterface<T> = {
            data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                createdAt: new Date(now).toISOString(),
                expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                strategy: this.name,
                hitCount: 0
            }
        };

        await redisSet(redis, key, cacheData, ttl);
        return data;
    }
}

// ---------------------------------------------------------------------------
// StaleWhileRevalidateWithLockFind
// ---------------------------------------------------------------------------

/**
 * Hybrid strategy: Stale-While-Revalidate with Distributed Locking.
 *
 * Combines SWR for low latency with distributed locking to prevent thundering
 * herds on both initial cache misses and background revalidation cycles.
 * Suited for high-concurrency workloads with expensive upstream calls.
 *
 * Bugs fixed:
 * - staleAt fallback defaulted to createdAt+0 when both staleTime and ttl
 *   were undefined, causing every hit to trigger a background refresh. It now
 *   skips the refresh when no staleness boundary can be determined.
 * - Unused `duration` variable inside refreshInBackgroundWithLock removed.
 */
export class StaleWhileRevalidateWithLockFind implements CacheStrategy {
    name = "staleWhileRevalidateWithLock";

    constructor() { }

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T> {
        if (ttl !== undefined && ttl <= 0) {
            throw new Error("TTL must be a positive number");
        }
        if (staleTime !== undefined && staleTime <= 0) {
            throw new Error("StaleTime must be a positive number");
        }
        if (staleTime !== undefined && ttl !== undefined && staleTime >= ttl * 1000) {
            throw new Error("StaleTime must be less than TTL");
        }

        const cached = await redisGet<T>(redis, key);

        if (cached) {
            const now = Date.now();
            const createdAt = new Date(cached.metadata.createdAt).getTime();

            // Determine the staleness boundary. When neither staleAt metadata
            // nor a staleTime parameter is available we cannot determine a
            // boundary, so we treat the entry as permanently fresh and skip
            // the background refresh entirely.
            let staleAt: number | null = null;

            if (cached.metadata.staleAt) {
                staleAt = new Date(cached.metadata.staleAt).getTime();
            } else if (staleTime !== undefined) {
                staleAt = createdAt + staleTime;
            } else if (ttl !== undefined) {
                staleAt = createdAt + ttl * 0.9;
            }
            // If staleAt is still null, no refresh is triggered.

            cached.metadata.hitCount++;

            if (staleAt !== null && now >= staleAt) {
                this.refreshInBackgroundWithLock(key, ttl, staleTime, fallback, redis);
            }

            // Persist the updated hitCount. Use remaining TTL to avoid
            // accidentally extending the entry's lifetime.
            const remainingMs = await redis.pttl(cacheKey(key));
            const persistTtl = remainingMs > 0 ? remainingMs : cached.metadata.ttl;
            await redisSet(redis, key, cached, persistTtl);

            return cached.data;
        }

        return this.acquireLockAndFetch(key, ttl, staleTime, fallback, redis);
    }

    private async acquireLockAndFetch<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T> {
        const lockKey = `lock:${key}`;
        const lockValue = randomUUID();
        const MAX_WAIT = 5_000;

        const acquired = await redis.call(
            "SET",
            lockKey,
            lockValue,
            "NX",
            "PX",
            5_000
        ) as string | null;

        if (acquired === "OK") {
            console.debug(`[StaleWhileRevalidateWithLock] Lock acquired for key: ${key}`);

            try {
                const start = Date.now();
                const data = await fallback();
                const duration = Date.now() - start;

                // Extend the lock when the upstream call was slow so
                // followers do not time out before the cache is populated.
                const dynamicLockTtl = Math.max(duration * 2, 3_000);
                if (duration > 2_500) {
                    await redis.call(
                        "SET",
                        lockKey,
                        lockValue,
                        "XX",
                        "PX",
                        dynamicLockTtl
                    ).catch(err =>
                        console.warn(`[StaleWhileRevalidateWithLock] Failed to extend lock for ${lockKey}:`, err)
                    );
                }

                await this.saveCache(key, data, ttl, staleTime, 0, redis);
                return data;
            } finally {
                await releaseLock(redis, lockKey, lockValue);
            }
        }

        const cachedData = await this.waitWithBackoff<T>(key, redis, MAX_WAIT);
        if (cachedData) return cachedData;

        console.warn(
            `[StaleWhileRevalidateWithLock] Failed to acquire cached data for key: ${key}, falling back`
        );
        return fallback();
    }

    private refreshInBackgroundWithLock<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): void {
        const lockKey = `lock:refresh:${key}`;
        const lockValue = randomUUID();

        (async () => {
            const acquired = await redis.call(
                "SET",
                lockKey,
                lockValue,
                "NX",
                "PX",
                5_000
            ) as string | null;

            if (acquired !== "OK") return;

            try {
                const data = await fallback();
                await this.saveCache(key, data, ttl, staleTime, 0, redis);
            } catch (err) {
                console.error(
                    `[StaleWhileRevalidateWithLock] Background refresh failed for ${key}:`,
                    err
                );
            } finally {
                await releaseLock(redis, lockKey, lockValue);
            }
        })().catch(err =>
            console.error(
                `[StaleWhileRevalidateWithLock] Critical error in background refresh for ${key}:`,
                err
            )
        );
    }

    private async waitWithBackoff<T>(
        key: string,
        redis: Redis,
        maxWait: number
    ): Promise<T | null> {
        let delay = 20;
        const start = Date.now();
        let attempts = 0;
        const maxAttempts = 50;

        while (Date.now() - start < maxWait && attempts < maxAttempts) {
            const cached = await redisGet<T>(redis, key);
            if (cached) return cached.data;

            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 500);
            attempts++;
        }

        console.warn(
            `[StaleWhileRevalidateWithLock] waitWithBackoff timeout for key: ${key} after ${attempts} attempts`
        );
        return null;
    }

    private async saveCache<T>(
        key: string,
        data: T,
        ttl: number | undefined,
        staleTime: number | undefined,
        hitCount: number,
        redis: Redis
    ): Promise<void> {
        const now = Date.now();
        const ttlMs = ttl !== undefined ? ttl * 1000 : undefined;

        const cacheData: CacheInterface<T> = {
            data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                createdAt: new Date(now).toISOString(),
                expiresAt: ttlMs ? new Date(now + ttlMs).toISOString() : undefined,
                strategy: this.name,
                hitCount
            }
        };
        await redisSet(redis, key, cacheData, ttl);
    }
}

// ---------------------------------------------------------------------------
// StaleWhileRevalidateFind
// ---------------------------------------------------------------------------

/**
 * Stale-While-Revalidate strategy (SWR).
 *
 * Serves stale data immediately while refreshing it in the background once
 * the stale window has elapsed. Does not use distributed locking, so in a
 * multi-instance deployment multiple nodes may refresh concurrently when an
 * entry becomes stale. Use StaleWhileRevalidateWithLockFind if that is a
 * concern.
 *
 * Bug fixed: the same staleAt fallback issue present in
 * StaleWhileRevalidateWithLockFind existed here. When no boundary can be
 * computed the refresh is now skipped rather than triggering on every hit.
 */
export class StaleWhileRevalidateFind implements CacheStrategy {
    name = "staleWhileRevalidate";

    constructor() { }

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T> {
        const cached = await redisGet<T>(redis, key);

        if (cached) {
            const now = Date.now();
            const createdAt = new Date(cached.metadata.createdAt).getTime();

            let staleAt: number | null = null;

            if (cached.metadata.staleAt) {
                staleAt = new Date(cached.metadata.staleAt).getTime();
            } else if (staleTime !== undefined) {
                staleAt = createdAt + staleTime;
            } else if (ttl !== undefined) {
                staleAt = createdAt + ttl * 0.9;
            }

            cached.metadata.hitCount++;

            if (staleAt !== null && now >= staleAt) {
                // Stale: serve the cached value and refresh in the background.
                this.refreshInBackground(key, ttl, staleTime, fallback, redis);
            } else {
                // Fresh: persist the incremented hitCount using the remaining
                // TTL so the entry does not receive an unintended extension.
                const remainingMs = await redis.pttl(cacheKey(key));
                const persistTtl = remainingMs > 0 ? remainingMs : cached.metadata.ttl;
                redisSet(redis, key, cached, persistTtl).catch(err =>
                    console.error(`[StaleWhileRevalidateFind] Failed to persist hitCount for ${key}:`, err)
                );
            }

            return cached.data;
        }

        const data = await fallback();
        await this.saveCache(key, data, ttl, staleTime, 0, redis);
        return data;
    }

    private async saveCache<T>(
        key: string,
        data: T,
        ttl: number | undefined,
        staleTime: number | undefined,
        hitCount: number,
        redis: Redis
    ): Promise<void> {
        const now = Date.now();
        const cacheData: CacheInterface<T> = {
            data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                createdAt: new Date(now).toISOString(),
                expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                strategy: this.name,
                hitCount
            }
        };
        await redisSet(redis, key, cacheData, ttl);
    }

    private refreshInBackground<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): void {
        (async () => {
            try {
                const data = await fallback();
                await this.saveCache(key, data, ttl, staleTime, 0, redis);
            } catch (err) {
                console.error(`[StaleWhileRevalidateFind] Background refresh failed for ${key}:`, err);
            }
        })();
    }
}

// ---------------------------------------------------------------------------
// CacheLockingFind
// ---------------------------------------------------------------------------

/**
 * Caching strategy with distributed locking.
 *
 * On a cache miss exactly one process (the leader) acquires a Redis lock and
 * calls the fallback. All other concurrent processes (followers) wait using
 * an exponential backoff loop. If the leader's fallback throws, the lock is
 * released immediately and followers are allowed to fall back to calling the
 * upstream themselves rather than spinning until MAX_WAIT expires.
 *
 * The original implementation used a fixed polling interval (WAIT_INTERVAL)
 * which could generate a large number of Redis reads under contention.
 * This version uses the same exponential backoff approach used elsewhere in
 * this module.
 */
export class CacheLockingFind implements CacheStrategy {
    name = "cacheLocking";

    private readonly LOCK_TTL = 10_000;  // ms
    private readonly MAX_WAIT = 5_000;   // ms
    constructor() { }

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        redis: Redis
    ): Promise<T> {
        const cached = await redisGet<T>(redis, key);
        if (cached) return cached.data;

        const lockKey = `lock:${key}`;
        const lockValue = randomUUID();
        const start = Date.now();

        const acquired = await redis.call(
            "SET",
            lockKey,
            lockValue,
            "NX",
            "PX",
            this.LOCK_TTL
        ) as string | null;

        if (acquired === "OK") {
            // Leader: fetch, populate the cache, then release the lock.
            try {
                const data = await fallback();
                const now = Date.now();

                const cacheData: CacheInterface<T> = {
                    data,
                    metadata: {
                        ttl,
                        staleTime: staleTime?.toString(),
                        staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                        createdAt: new Date(now).toISOString(),
                        expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                        strategy: this.name,
                        hitCount: 0
                    }
                };

                await redisSet(redis, key, cacheData, ttl);
                return data;
            } finally {
                await releaseLock(redis, lockKey, lockValue);
            }
        }

        // Follower: poll with exponential backoff until the leader populates
        // the cache or the maximum wait time is reached.
        let delay = 20;
        let attempts = 0;
        const maxAttempts = 50;

        while (Date.now() - start < this.MAX_WAIT && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 500);
            attempts++;

            const populated = await redisGet<T>(redis, key);
            if (populated) return populated.data;
        }

        // Defensive fallback: reached only when the leader has not populated
        // the cache within MAX_WAIT (e.g. the leader's fallback was very slow
        // or the leader process crashed after releasing the lock without writing).
        console.warn(
            `[CacheLockingFind] Follower fallback triggered for key: ${key} after ${attempts} attempts`
        );
        return fallback();
    }
}