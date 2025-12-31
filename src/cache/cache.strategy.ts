import Keyv from "keyv";
import { CacheInterface } from "./cache.interfaces";
import { Inject } from "@nestjs/common";
import Redis from "ioredis";
import { randomUUID } from "crypto";

/**
 * Interface that all cache strategies must implement.
 * Defines the contract for executing a cache retrieval operation.
 */
export interface CacheStrategy {
    /** Unique name of the strategy */
    name: string;

    /**
     * Executes the caching strategy logic.
     * 
     * @param key - The unique cache key.
     * @param ttl - Time-To-Live in milliseconds.
     * @param staleTime - Time in milliseconds before data is considered stale.
     * @param fallback - Function to fetch data on cache miss.
     * @param keyvInstance - The Keyv instance to interact with Redis.
     * @returns The cached or fetched data.
     */
    execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T>;

}

// ============== ESTRATEGIAS EXISTENTES (sin cambios) ==============

/**
 * Simple caching strategy.
 * Implements a basic "Cache-Aside" pattern with a renewal mechanism on hits.
 */
export class CacheSimpleFind implements CacheStrategy {
    name = "simpleFind";
    /** Maximum number of times the TTL can be renewed on cache hits */
    private readonly MAX_HIT_RENEWALS = 10;

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T> {
        const cached = await keyvInstance.get<CacheInterface<T>>(key);
        if (cached) {
            cached.metadata.hitCount++;

            // Renew TTL only if it hasn't exceeded the maximum number of renewals
            const renewalTtl = cached.metadata.hitCount <= this.MAX_HIT_RENEWALS
                ? ttl
                : cached.metadata.ttl;

            keyvInstance.set(key, cached, renewalTtl);
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
                createdAt: new Date().toISOString(),
                expiresAt: ttl ? new Date(Date.now() + ttl).toISOString() : undefined,
                strategy: this.name,
                hitCount: 0
            }
        };
        await keyvInstance.set(key, cacheData, ttl);
        return data;
    }
};

/**
 * Hybrid Strategy: Stale-While-Revalidate with Distributed Locking.
 * Combines SWR for low latency with distributed locking to prevent thundering herds on cache misses.
 * Ideally suited for high-concurrency, expensive-to-compute data.
 */
export class StaleWhileRevalidateWithLockFind implements CacheStrategy {
    name = "staleWhileRevalidateWithLock";

    constructor(
        @Inject('REDIS_CLIENT')
        private readonly redis: Redis
    ) { }

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T> {

        const cached = await keyvInstance.get<CacheInterface<T>>(key);

        // ============================
        // 1️⃣ CACHE HIT → respuesta inmediata
        // ============================
        if (cached) {
            const now = Date.now();
            const createdAt = new Date(cached.metadata.createdAt).getTime();

            const staleAt = cached.metadata.staleAt
                ? new Date(cached.metadata.staleAt).getTime()
                : createdAt + (staleTime ?? (ttl ? ttl * 0.9 : 0));

            cached.metadata.hitCount++;

            // 🔄 Stale → refresh background con lock suave
            if (now >= staleAt) {
                this.refreshInBackgroundWithLock(
                    key,
                    ttl,
                    staleTime,
                    fallback,
                    keyvInstance
                );
            }

            // Renovar TTL original (no extender artificialmente)
            await keyvInstance.set(key, cached, cached.metadata.ttl);

            return cached.data;
        }

        // ============================
        // 2️⃣ CACHE MISS → lock fuerte
        // ============================
        return await this.acquireLockAndFetch(
            key,
            ttl,
            staleTime,
            fallback,
            keyvInstance
        );
    }

    // =====================================================
    // 🔐 LOCK FUERTE PARA CACHE MISS (con backoff)
    // =====================================================
    private async acquireLockAndFetch<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T> {

        const lockKey = `lock:${key}`;
        const lockValue = randomUUID();
        const MAX_WAIT = 5_000;

        // Intento inicial de lock
        const acquired = await this.redis.call(
            "SET",
            lockKey,
            lockValue,
            "NX",
            "PX",
            5_000 // TTL temporal, se ajusta luego
        ) as string | null;

        // ============================
        // 🟢 LÍDER
        // ============================
        if (acquired === "OK") {
            let dynamicLockTTL = 5_000;

            try {
                const start = Date.now();
                const data = await fallback();
                const duration = Date.now() - start;

                // 🔥 LOCK_TTL dinámico
                dynamicLockTTL = Math.max(duration * 2, 3_000);

                await this.saveCache(
                    key,
                    data,
                    ttl,
                    staleTime,
                    0,
                    keyvInstance
                );

                return data;

            } finally {
                // 🔐 Liberación segura del lock
                await this.releaseLock(lockKey, lockValue);
            }
        }

        // ============================
        // 🔵 FOLLOWERS → backoff exponencial
        // ============================
        const cachedData = await this.waitWithBackoff<T>(
            key,
            keyvInstance,
            MAX_WAIT
        );

        if (cachedData) return cachedData;

        // ============================
        // 🔴 Fallback defensivo (muy raro)
        // ============================
        return await fallback();
    }

    // =====================================================
    // 🔄 Refresh background con lock suave
    // =====================================================
    private async refreshInBackgroundWithLock<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<void> {

        const lockKey = `lock:refresh:${key}`;
        const lockValue = randomUUID();

        const acquired = await this.redis.call(
            "SET",
            lockKey,
            lockValue,
            "NX",
            "PX",
            5_000
        ) as string | null;

        if (acquired !== "OK") return;

        (async () => {
            try {
                const start = Date.now();
                const data = await fallback();
                const duration = Date.now() - start;

                await this.saveCache(
                    key,
                    data,
                    ttl,
                    staleTime,
                    0,
                    keyvInstance
                );

            } catch (err) {
                console.error("Background refresh failed:", err);
            } finally {
                await this.releaseLock(lockKey, lockValue);
            }
        })();
    }

    // =====================================================
    // ⏳ Backoff exponencial para followers
    // =====================================================
    private async waitWithBackoff<T>(
        key: string,
        keyvInstance: Keyv,
        maxWait: number
    ): Promise<T | null> {

        let delay = 20;
        const start = Date.now();

        while (Date.now() - start < maxWait) {
            const cached = await keyvInstance.get<CacheInterface<T>>(key);
            if (cached) return cached.data;

            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 500);
        }

        return null;
    }

    // =====================================================
    // 💾 Guardado de cache
    // =====================================================
    private async saveCache<T>(
        key: string,
        data: T,
        ttl: number | undefined,
        staleTime: number | undefined,
        hitCount: number,
        keyvInstance: Keyv
    ) {
        const now = Date.now();

        const cacheData: CacheInterface<T> = {
            data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime
                    ? new Date(now + staleTime).toISOString()
                    : undefined,
                createdAt: new Date(now).toISOString(),
                expiresAt: ttl
                    ? new Date(now + ttl).toISOString()
                    : undefined,
                strategy: this.name,
                hitCount
            }
        };

        await keyvInstance.set(key, cacheData, ttl);
    }

    // =====================================================
    // 🔓 Release de lock seguro (Lua)
    // =====================================================
    private async releaseLock(lockKey: string, lockValue: string) {
        await this.redis.eval(
            `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
            `,
            1,
            lockKey,
            lockValue
        );
    }
};

/**
 * Stale-While-Revalidate Strategy (SWR).
 * Serves stale data immediately while refreshing it in the background if the stale time has passed.
 * Does not use distributed locking, so multiple nodes might refresh simultaneously.
 */
export class StaleWhileRevalidateFind implements CacheStrategy {
    name = "staleWhileRevalidate";

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T> {
        const cached = await keyvInstance.get<CacheInterface<T>>(key);

        if (cached) {
            const now = Date.now();
            const createdAt = new Date(cached.metadata.createdAt).getTime();

            const staleAtTime = cached.metadata.staleAt
                ? new Date(cached.metadata.staleAt).getTime()
                : (createdAt + (staleTime ?? (ttl ? ttl * 0.9 : 0)));

            cached.metadata.hitCount++;

            if (now >= staleAtTime) {
                // Stale data: serve cache but refresh in background
                this.refreshInBackground(key, ttl, staleTime, fallback, keyvInstance);
            } else {
                // Fresh data: keep original TTL without resetting it
                keyvInstance.set(key, cached, cached.metadata.ttl);
            }

            return cached.data;
        }

        const data = await fallback();
        await this.saveCache(key, data, ttl, staleTime, 0, keyvInstance);
        return data;
    }

    private async saveCache<T>(
        key: string,
        data: T,
        ttl: number | undefined,
        staleTime: number | undefined,
        hitCount: number,
        keyvInstance: Keyv
    ) {
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
                hitCount: hitCount
            }
        };
        await keyvInstance.set(key, cacheData, ttl);
    }

    private refreshInBackground<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): void {
        (async () => {
            try {
                const data = await fallback();
                await this.saveCache(key, data, ttl, staleTime, 0, keyvInstance);
            } catch (err) {
                console.error(`Background refresh failed for ${key}:`, err);
            }
        })();
    }
}


/**
 * Caching Strategy with Distributed Locking (CacheLocking).
 * Ensures that only one process (the "leader") fetches the data on a cache miss, preventing thundering herds.
 * Other processes (followers) poll and wait for the leader to populates the cache.
 */
export class CacheLockingFind implements CacheStrategy {
    name = "cacheLocking";

    private readonly LOCK_TTL = 10_000;     // 10s
    private readonly WAIT_INTERVAL = 50;    // ms
    private readonly MAX_WAIT = 5_000;      // 5s

    constructor(
        @Inject('REDIS_CLIENT')
        private readonly redis: Redis
    ) { }

    async execute<T>(
        key: string,
        ttl: number | undefined,
        staleTime: number | undefined,
        fallback: () => Promise<T>,
        keyvInstance: Keyv
    ): Promise<T> {

        // 1️⃣ Cache HIT rápido
        const cached = await keyvInstance.get<CacheInterface<T>>(key);
        if (cached) {
            return cached.data;
        }

        const lockKey = `lock:${key}`;
        const lockValue = randomUUID();
        const start = Date.now();

        // 2️⃣ Intentar adquirir lock atómico
        const acquired = await this.redis.call(
            'SET',
            lockKey,
            lockValue,
            'NX',
            'PX',
            this.LOCK_TTL
        ) as string | null;

        if (acquired === 'OK') {
            // 🟢 LÍDER
            try {
                const data = await fallback();

                const now = Date.now();
                const cacheData: CacheInterface<T> = {
                    data,
                    metadata: {
                        ttl,
                        staleTime: staleTime?.toString(),
                        staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                        createdAt: new Date().toISOString(),
                        expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                        strategy: this.name,
                        hitCount: 0
                    }
                };

                await keyvInstance.set(key, cacheData, ttl);
                return data;

            } finally {
                // 🔐 liberar lock de forma SEGURA (Lua)
                await this.releaseLock(lockKey, lockValue);
            }
        }

        // 🔵 FOLLOWERS → esperar cache
        while (Date.now() - start < this.MAX_WAIT) {
            await this.sleep(this.WAIT_INTERVAL);

            const cached = await keyvInstance.get<CacheInterface<T>>(key);
            if (cached) {
                return cached.data;
            }
        }

        // 🔴 Fallback defensivo (muy raro)
        const data = await fallback();
        return data;
    }

    private async releaseLock(lockKey: string, lockValue: string) {
        await this.redis.eval(
            `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
            `,
            1,
            lockKey,
            lockValue
        );
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};