import { Inject, Injectable } from '@nestjs/common';
import { CacheFactoryService } from './cache.factory';
import { createHash, randomUUID } from 'crypto';
import { CacheInterface } from './cache.interfaces';
import Redis from 'ioredis';

/**
 * Core Cache Service.
 * Manages cache key generation, versioning, TTL calculation (including jitter), and delegates
 * actual data retrieval to the CacheFactory.
 *
 * Features:
 * - Version-based invalidation: Allows invalidating entire entities or specific queries.
 * - Multiple strategies: Supports Simple, Stale-While-Revalidate, and Distributed Locking.
 * - Jitter: Prevents cache stampedes by adding randomness to TTLs.
 * - Query-hashing: Deterministically generates keys from query objects.
 */
@Injectable()
export class CacheService {

    constructor(
        private readonly cacheFactory: CacheFactoryService,
        @Inject("REDIS_CLIENT") private readonly redis: Redis
    ) { }

    // ==================== PRIVATE: SERIALIZATION ====================

    /**
     * Serializes a value to a JSON string for storage in Redis.
     */
    private serialize<T>(value: T): string {
        return JSON.stringify(value);
    }

    /**
     * Deserializes a Redis string back into a typed value.
     * Returns null if the string is null or unparseable.
     */
    private deserialize<T>(raw: string | null): T | null {
        if (raw === null) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    // ==================== PRIVATE: KEY GENERATION ====================

    /**
     * Generates an MD5 hash from a query object.
     * @param query - Query object to hash.
     * @returns MD5 hash string.
     */
    private buildHashedKey(query: any): string {
        return createHash("md5").update(JSON.stringify(query)).digest("hex");
    }

    /**
     * Builds the namespaced Redis key used for cache data entries.
     * The "keyv:" prefix is preserved for backwards compatibility with data
     * written by the previous Keyv-based implementation. Remove it (or flush
     * Redis) once the rollout is complete.
     */
    private dataCacheKey(key: string): string {
        return `igaProductos:${key}`;
    }

    /**
     * Builds the namespaced Redis key used for version counters.
     * Uses a dedicated "ver:" prefix to guarantee that version keys never
     * collide with cache data keys regardless of the entity name.
     */
    private versionRedisKey(logicalKey: string): string {
        return `ver:${logicalKey}`;
    }

    /**
     * Builds a version key for an entity/query combination.
     * @param entity - Entity name.
     * @param query  - Optional query parameters.
     * @returns Logical version key (e.g. "products:version" or "products:version:abc123").
     */
    private buildVersionKey(entity: string, query?: any): string {
        if (!query) return `${entity}:version`;
        const hash = this.buildHashedKey(query);
        return `${entity}:version:${hash}`;
    }

    /**
     * Builds a version key for an entity.
     * @param entity - Entity name.
     * @returns Logical version key (e.g. "products:entity:version").
     */
    private buildEntityVersionKey(entity: string): string {
        return `${entity}:version`;
    }

    /**
     * Builds a cache key incorporating the current entity and query version numbers.
     * @param args - Entity name, query version, entity version, and optional query parameters.
     * @returns Cache key string (e.g. "products:eV2" or "products:abc123:eV2:qV3").
     */
    private buildCacheKey(args: {
        entity: string,
        queryVersion: number,
        entityVersion: number,
        query?: any
    }): string {
        if (!args.query) return `${args.entity}:eV${args.entityVersion}`;
        const hash = this.buildHashedKey(args.query);
        return `${args.entity}:${hash}:eV${args.entityVersion}:qV${args.queryVersion}`;
    }

    // ==================== PRIVATE: RAW REDIS HELPERS ====================

    /**
     * Writes a CacheInterface entry to Redis.
     * Stores the entry without an expiry when ttlMs is undefined or zero.
     */
    private async redisSet<T>(
        key: string,
        value: CacheInterface<T>,
        ttlMs: number | undefined
    ): Promise<void> {
        const payload = this.serialize(value);
        const rKey = this.dataCacheKey(key);
        if (ttlMs !== undefined && ttlMs > 0) {
            await this.redis.set(rKey, payload, "PX", ttlMs);
        } else {
            await this.redis.set(rKey, payload);
        }
    }

    /**
     * Reads a CacheInterface entry from Redis.
     * Returns null on a cache miss or a deserialization error.
     */
    private async redisGet<T>(key: string): Promise<CacheInterface<T> | null> {
        const raw = await this.redis.get(this.dataCacheKey(key));
        return this.deserialize<CacheInterface<T>>(raw);
    }

    /**
     * Deletes a cache entry from Redis.
     * Returns true if the key existed and was removed.
     */
    private async redisDel(key: string): Promise<boolean> {
        const count = await this.redis.del(this.dataCacheKey(key));
        return count > 0;
    }

    /**
 * Releases a Redis lock atomically using a Lua script.
 * The lock is removed only when the stored token matches `lockValue`,
 * preventing a process from releasing a lock it no longer owns.
 */
    private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
        try {
            await this.redis.eval(
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
            console.error(`[CacheService] Failed to release lock ${lockKey} via Lua:`, err);
            // Best-effort hard delete to avoid a permanently held lock.
            try { await this.redis.del(lockKey); } catch { /* swallow */ }
        }
    }

    /**
     * Polls Redis with exponential backoff until the key is populated or the
     * timeout expires. Used by follower processes waiting for the leader to
     * backfill a cache miss.
     *
     * @param logicalKey - Logical (non-namespaced) cache key to poll.
     * @param maxWaitMs  - Maximum time to wait in milliseconds.
     * @returns Deserialized data, or null on timeout.
     */
    private async waitForMissToPopulate<T>(
        logicalKey: string,
        maxWaitMs: number
    ): Promise<T | null> {
        let delay = 20;
        const start = Date.now();
        let attempts = 0;
        const maxAttempts = 50;

        while (Date.now() - start < maxWaitMs && attempts < maxAttempts) {
            const cached = await this.redisGet<T>(logicalKey);
            if (cached !== null) return cached.data;
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 500);
            attempts++;
        }

        console.warn(
            `[CacheService] waitForMissToPopulate timeout for key ${logicalKey} after ${attempts} attempts`
        );
        return null;
    }


    // ==================== PRIVATE: VERSION MANAGEMENT ====================

    // /**
    //  * Retrieves the current version number for an entity/query.
    //  * Defaults to 1 when the version key does not yet exist.
    //  * @param entity - Entity name.
    //  * @param query  - Optional query parameters.
    //  * @returns Current version number.
    //  */
    // private async getVersion(entity: string, query?: any): Promise<number> {
    //     const rKey = this.versionRedisKey(this.buildVersionKey(entity, query));
    //     const raw = await this.redis.get(rKey);
    //     if (raw === null) return 1;
    //     const parsed = parseInt(raw, 10);
    //     return isNaN(parsed) ? 1 : parsed;
    // }

    // /**
    //  * Retrieves the current entity-level version number.
    //  * Defaults to 1 when the version key does not yet exist.
    //  * @param entity - Entity name.
    //  * @returns Current entity version number.
    //  */
    // private async getEntityVersion(entity: string): Promise<number> {
    //     const rKey = this.versionRedisKey(this.buildEntityVersionKey(entity));
    //     const raw = await this.redis.get(rKey);
    //     if (raw === null) return 1;
    //     const parsed = parseInt(raw, 10);
    //     return isNaN(parsed) ? 1 : parsed;
    // }

    /**
     * Fetches both the entity-level and query-level version counters in a
     * single Redis call.
     *
     * When no query is provided both version keys are identical, so only one
     * GET is issued. When a query is provided a single MGET retrieves both
     * keys in one round-trip instead of two serial GETs.
     *
     * @param entity - Entity name.
     * @param query  - Optional query parameters.
     * @returns { entityVersion, queryVersion } – both default to 1 when absent.
     */
    private async getVersionsBatch(
        entity: string,
        query?: any
    ): Promise<{ entityVersion: number; queryVersion: number }> {
        const entityVersionKey = this.versionRedisKey(this.buildEntityVersionKey(entity));

        // Without a query both keys resolve to the same Redis key.
        // A single GET avoids the redundant second call.
        if (!query) {
            const raw = await this.redis.get(entityVersionKey);
            const version = raw === null ? 1 : (parseInt(raw, 10) || 1);
            return { entityVersion: version, queryVersion: version };
        }

        const queryVersionKey = this.versionRedisKey(this.buildVersionKey(entity, query));
        const [entityRaw, queryRaw] = await this.redis.mget(entityVersionKey, queryVersionKey);

        return {
            entityVersion: entityRaw === null ? 1 : (parseInt(entityRaw, 10) || 1),
            queryVersion: queryRaw === null ? 1 : (parseInt(queryRaw, 10) || 1),
        };
    }


    /**
     * Increments the entity-level version counter.
     * Effectively invalidates all cached data for that entity regardless of query.
     * Version keys are retained for 7 days to avoid premature resets while
     * preventing indefinite key accumulation.
     * @param entity - Entity name.
     */
    private async incrementEntityVersion(entity: string): Promise<void> {
        const rKey = this.versionRedisKey(this.buildEntityVersionKey(entity));
        const { entityVersion } = await this.getVersionsBatch(entity);
        await this.redis.set(rKey, String(entityVersion + 1), "PX", 1000 * 60 * 60 * 24 * 7);
    }

    /**
     * Increments the query-level version counter for an entity/query combination.
     * Effectively invalidates the cached result for that specific query.
     * @param entity - Entity name.
     * @param query  - Query parameters.
     */
    private async incrementVersion(entity: string, query: any): Promise<void> {
        const rKey = this.versionRedisKey(this.buildVersionKey(entity, query));
        const { queryVersion } = await this.getVersionsBatch(entity, query);
        await this.redis.set(rKey, String(queryVersion + 1), "PX", 1000 * 60 * 60 * 24 * 7);
    }

    // ==================== PRIVATE: TTL UTILITIES ====================

    /**
     * Applies jitter to a TTL value to prevent cache stampedes.
     * @param jitterFactor    - Fraction of the TTL to use as the jitter range (default 0.2 = ±10%).
     * @param ttlMilliseconds - Base TTL in milliseconds.
     * @returns TTL with jitter applied, or undefined if no TTL was provided.
     */
    private applyJitter(
        jitterFactor: number = 0.2,
        ttlMilliseconds?: number
    ): number | undefined {
        if (!ttlMilliseconds) return undefined;
        const delta = ttlMilliseconds * jitterFactor * (Math.random() - 0.5);
        return Math.floor(Math.max(ttlMilliseconds + delta, 1));
    }

    // ==================== PUBLIC: INVALIDATION ====================

    /**
     * Invalidates the cached result for a specific entity/query combination.
     *
     * @param args.entity - Entity name to invalidate.
     * @param args.query  - Query parameters identifying the specific cached result.
     *
     * @example
     * await cacheService.invalidateQuery({ entity: 'products', query: { category: 'electronics' } });
     */
    async invalidateQuery(args: { entity: string, query: any }): Promise<void> {
        await this.incrementVersion(args.entity, args.query);
    }

    /**
     * Invalidates all cached data for an entity regardless of query.
     *
     * @param args.entity - Entity name to invalidate.
     *
     * @example
     * await cacheService.invalidateEntity({ entity: 'products' });
     */
    async invalidateEntity(args: { entity: string }): Promise<void> {
        await this.incrementEntityVersion(args.entity);
    }

    /**
     * Invalidates multiple entities in parallel.
     *
     * @param args - Array of objects containing the entity name to invalidate.
     *
     * @example
     * await cacheService.invalidateMultipleEntities([
     *   { entity: 'products' },
     *   { entity: 'users' }
     * ]);
     */
    async invalidateMultipleEntities(args: { entity: string }[]): Promise<void> {
        await Promise.all(args.map(a => this.invalidateEntity({ entity: a.entity })));
    }

    /**
     * Invalidates multiple entity/query combinations in parallel.
     *
     * @param args - Array of objects containing the entity name and query parameters to invalidate.
     *
     * @example
     * await cacheService.invalidateMultipleQueries([
     *   { entity: 'products', query: { category: 'electronics' } },
     *   { entity: 'products', query: { category: 'clothing' } },
     * ]);
     */
    async invalidateMultipleQueries(args: { entity: string, query: any }[]): Promise<void> {
        await Promise.all(args.map(a => this.invalidateQuery({ entity: a.entity, query: a.query })));
    }

    // ==================== PUBLIC: CACHE OPERATIONS ====================

    /**
     * Retrieves data from cache or executes the fallback function on a cache miss.
     * Supports version-based invalidation and configurable cache strategies.
     *
     * @param args.method            - Cache strategy to use.
     * @param args.entity            - Entity name used for key generation.
     * @param args.query             - Optional query parameters included in the cache key.
     * @param args.aditionalOptions  - Optional TTL and jitter configuration.
     * @param args.fallback          - Function to execute on a cache miss.
     * @returns Cached or freshly fetched data.
     *
     * @example
     * const users = await cacheService.remember<User[]>({
     *   method: "staleWhileRevalidate",
     *   entity: "users",
     *   query: { all: true },
     *   fallback: async () => this.usersRepo.find()
     * });
     *
     * @example
     * const product = await cacheService.remember<Product>({
     *   method: "simpleFind",
     *   entity: "product:123",
     *   aditionalOptions: { ttlMilliseconds: 3600000, enabledJitter: false },
     *   fallback: async () => this.productsRepo.findOne({ where: { id: "123" } })
     * });
     */
    async remember<T>(args: {
        method: "simpleFind" | "staleWhileRevalidate" | "cacheLocking" | "staleWhileRevalidateWithLock",
        entity: string,
        query?: any,
        aditionalOptions?: {
            ttlMilliseconds?: number,
            staleTimeMilliseconds?: number,
            enabledJitter?: boolean,
        },
        fallback: () => Promise<T>
    }): Promise<T> {
        if (!args.entity) throw new Error("Entity is required in CacheOptions");

        const defaultOptions = {
            enabledJitter: true,
            ttlMilliseconds: 300_000 // 5 minutes
        };

        const finalOptions = { ...defaultOptions, ...args.aditionalOptions };

        const ttl: number | undefined = finalOptions.enabledJitter
            ? this.applyJitter(0.2, finalOptions.ttlMilliseconds)
            : finalOptions.ttlMilliseconds;

        // Bug fixed: previously defaulted to 0 when ttl was undefined, which
        // caused every cache hit to be immediately treated as stale.
        const staleTime: number | undefined = args.aditionalOptions?.staleTimeMilliseconds
            ?? (ttl !== undefined ? ttl * 0.9 : undefined);

        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        return this.cacheFactory.findData<T>({
            type: args.method,
            redis: this.redis,
            key,
            ttl,
            staleTime
        }, args.fallback);
    }

    /**
     * Writes data directly into the cache with version-based keying and configurable TTL.
     *
     * @param args.entity           - Entity name for key generation.
     * @param args.query            - Optional query parameters included in the cache key.
     * @param args.data             - Data to store.
     * @param args.aditionalOptions - Optional TTL and jitter configuration.
     *
     * @example
     * await cacheService.setData({
     *   entity: "product:123",
     *   data: { name: "Product 123", price: 19.99 }
     * });
     */
    async setData<T>(args: {
        entity: string,
        query?: any,
        data: T,
        aditionalOptions?: {
            enabledJitter?: boolean,
            ttlMilliseconds?: number,
            staleTimeMilliseconds?: number
        }
    }): Promise<void> {
        if (!args.entity) throw new Error("Entity is required to save data in cache");

        const defaultOptions = {
            enabledJitter: true,
            ttlMilliseconds: 300_000
        };

        const finalOptions = { ...defaultOptions, ...args.aditionalOptions };

        const ttl: number | undefined = finalOptions.enabledJitter
            ? this.applyJitter(0.2, finalOptions.ttlMilliseconds)
            : finalOptions.ttlMilliseconds;

        // Bug fixed: same staleTime=0 default replaced with undefined.
        const staleTime: number | undefined = args.aditionalOptions?.staleTimeMilliseconds
            ?? (ttl !== undefined ? ttl * 0.9 : undefined);

        const now = Date.now();
        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const formattedData: CacheInterface<T> = {
            data: args.data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                createdAt: new Date(now).toISOString(),
                expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                strategy: "settedData",
                hitCount: 0
            }
        };

        await this.redisSet(key, formattedData, ttl);
    }

    /**
     * Retrieves cached data by entity and query without a fallback.
     * Returns null when no matching cache entry exists.
     *
     * @param args.entity - Entity name to retrieve.
     * @param args.query  - Optional query parameters to identify the cached entry.
     * @returns Cached data, or null if not found.
     *
     * @example
     * const products = await cacheService.getData<Product[]>({ entity: 'products' });
     *
     * @example
     * const products = await cacheService.getData<Product[]>({
     *   entity: 'products',
     *   query: { category: 'electronics' }
     * });
     */
    async getData<T>(args: {
        entity: string,
        query?: any
    }): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required in CacheOptions");

        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.redisGet<T>(key);
        if (!cached) return null;

        cached.metadata.hitCount++;

        // Bug fixed: use remaining TTL from Redis rather than the original TTL
        // stored in metadata, which would silently reset the full expiry window.
        const remainingMs = await this.redis.pttl(this.dataCacheKey(key));
        const persistTtl = remainingMs > 0 ? remainingMs : cached.metadata.ttl;

        // Fire-and-forget: a failed hitCount write is not critical.
        this.redisSet(key, cached, persistTtl).catch(err =>
            console.error(`[CacheService] Failed to persist hitCount for key ${key}:`, err)
        );

        return cached.data;
    }

    /**
 * Retrieves multiple cache entries in a single Redis MGET round-trip.
 * Each entry is resolved using the same version-based key generation as
 * {@link getData}, so entity/query invalidation is fully respected.
 *
 * Keys that are absent from the cache or cannot be deserialized are
 * reported in the `misses` array so the caller can decide how to
 * hydrate them (e.g. batch-query the DB and backfill with {@link setData}).
 *
 * @param args - Array of { entity, query? } tuples to look up.
 * @returns An object with:
 *   - `hits`:   a `Map<string, T>` of **logical key → unwrapped data**
 *               for every tuple found in the cache.
 *   - `misses`: an array of logical keys absent from the cache.
 *
 * @example
 * const { hits, misses } = await cacheService.getMultipleData<Product>([
 *   { entity: 'product', query: { id: '1' } },
 *   { entity: 'product', query: { id: '2' } },
 *   { entity: 'product', query: { id: '99' } },
 * ]);
 * // hits  → Map<string, Product>  ← keys found in cache
 * // misses → string[]             ← keys that were a cache miss
 */
    async getMultipleData<T>(
        args: { entity: string; query?: any }[]
    ): Promise<{ hits: Map<string, T>; misses: string[] }> {
        if (args.length === 0) return { hits: new Map(), misses: [] };

        // Build the two Redis version keys for each entry.
        // Deduplicate entity version keys to avoid redundant keys in the MGET
        // (e.g. when the same entity appears multiple times in args).
        const versionKeysPerArg = args.map((arg) => ({
            entityKey: this.versionRedisKey(this.buildEntityVersionKey(arg.entity)),
            queryKey: arg.query
                ? this.versionRedisKey(this.buildVersionKey(arg.entity, arg.query))
                : null,
        }));

        // Collect UNIQUE version keys preserving their position for later lookup.
        const uniqueVersionKeys = [
            ...new Set(
                versionKeysPerArg.flatMap(({ entityKey, queryKey }) =>
                    queryKey ? [entityKey, queryKey] : [entityKey]
                )
            ),
        ];

        // Single MGET for ALL version keys.
        const versionRaws = await this.redis.mget(...uniqueVersionKeys);
        const versionMap = new Map<string, number>();
        uniqueVersionKeys.forEach((key, i) => {
            const raw = versionRaws[i];
            versionMap.set(key, raw === null ? 1 : (parseInt(raw, 10) || 1));
        });

        // Resolve each logical cache key using the fetched versions.
        const keyEntries = args.map((arg, i) => {
            const { entityKey, queryKey } = versionKeysPerArg[i];
            const entityVersion = versionMap.get(entityKey)!;
            const queryVersion = queryKey ? versionMap.get(queryKey)! : entityVersion;
            return this.buildCacheKey({ entity: arg.entity, queryVersion, entityVersion, query: arg.query });
        });

        // Single MGET for ALL data keys.
        const namespacedKeys = keyEntries.map(k => this.dataCacheKey(k));
        const raws = await this.redis.mget(...namespacedKeys);

        const hits = new Map<string, T>();
        const misses: string[] = [];

        for (let i = 0; i < keyEntries.length; i++) {
            const entry = this.deserialize<CacheInterface<T>>(raws[i]);
            if (entry !== null) {
                hits.set(keyEntries[i], entry.data);
            } else {
                misses.push(keyEntries[i]);
            }
        }

        return { hits, misses };
    };

    /**
     * Retrieves multiple cache entries in a single Redis MGET round-trip.
     * For any misses, exactly one process (the **leader**) calls the batch
     * fallback, writes the results to Redis and releases each lock. All other
     * concurrent processes (**followers**) wait via exponential backoff and
     * re-read from Redis — avoiding repeated DB hits under high concurrency.
     *
     * ─────────────────────────── FLOW ───────────────────────────
     *
     * 1. MGET version keys   (1 Redis round-trip)
     * 2. MGET data keys      (1 Redis round-trip)
     * 3. Per miss → try SET lock:multiget:{key} NX   (parallel)
     *    ├─ Leader (OK)   → calls fallback ONCE with all its locked misses
     *    │                 → awaits redisSet per result → releases locks
     *    └─ Follower (—)  → waitWithBackoff until leader populates the key
     *                       └─ if timeout → defensive fallback call
     * 4. Merge results preserving original order.
     * 5. Report keys that were never resolved as `misses`.
     *
     * ─────────────────────── DETAILED EXAMPLE ───────────────────────────
     *
     * INPUT
     * ─────
     * where: [
     *   { entity: 'product', query: { uuid: 'uuid-1'  } },  ← Redis HIT
     *   { entity: 'product', query: { uuid: 'uuid-2'  } },  ← Redis HIT
     *   { entity: 'product', query: { uuid: 'uuid-99' } },  ← Redis MISS  → found in DB
     *   { entity: 'product', query: { uuid: 'uuid-xx' } },  ← Redis MISS  → NOT in DB
     * ]
     * fallback: async (misses) => {
     *   const uuids = misses.map(m => m.originalArg.query.uuid);  // ['uuid-99', 'uuid-xx']
     *   const rows  = await prisma.product.findMany({ where: { uuid: { in: uuids } } });
     *   // rows only contains uuid-99; uuid-xx doesn't exist in DB → omitted
     *   return rows.map(r => ({
     *     logicalKey: misses.find(m => m.originalArg.query.uuid === r.uuid)!.logicalKey,
     *     data: mapRowToProductI(r),
     *   }));
     * }
     * options: { ttl: 1_200_000, staleTime: 900_000 }
     *
     * PROCESS
     * ───────
     * Round-trip 1 : MGET version keys          → all default to v1
     * Round-trip 2 : MGET data keys             → [hit1, hit2, null, null]
     * Lock attempts : SET lock:multiget:{key-99} NX → OK  (leader for 99)
     *                 SET lock:multiget:{key-xx} NX → OK  (leader for xx)
     * Fallback call : DB WHERE uuid IN ('uuid-99', 'uuid-xx') → only uuid-99 found
     * redisSet      : igaProductos:product:{hash-99}:eV1:qV1 = <json>  (await)
     * releaseLocks  : del lock:multiget:{key-99}, lock:multiget:{key-xx}
     *
     * OUTPUT
     * ──────
     * {
     *   data: [
     *     { id:'1', uuid:'uuid-1',  name:'Laptop', ... },  ← hit
     *     { id:'2', uuid:'uuid-2',  name:'Mouse',  ... },  ← hit
     *     { id:'3', uuid:'uuid-99', name:'Screen', ... },  ← miss → hydrated from DB
     *   ],
     *   misses: ['product:{hash-xx}:eV1:qV1'],  ← uuid-xx: not in Redis, not in DB
     * }
     *
     * @param args.where            - Keys to look up (entity + optional query).
     * @param args.fallback         - Batch function called ONCE with all leader misses.
     *                                Must return `{ logicalKey, data }[]`. Entries not
     *                                found in the source should simply be omitted.
     * @param args.options.ttl      - TTL in ms for backfilled entries (default 5 min).
     * @param args.options.staleTime - Stale boundary in ms (default ttl × 0.9).
     * @param args.options.jitter   - Apply TTL jitter to prevent stampedes (default true).
     * @returns `{ data, misses }` where `data` is the merged array in original request
     *          order (falsy excluded) and `misses` are logical keys that could not be
     *          resolved from Redis or the fallback.
     *
     * @example
     * const { data, misses } = await this.cache.getMultipleDataWithFallback<ProductI>({
     *   where: [
     *     { entity: 'product', query: { uuid: 'uuid-1'  } },
     *     { entity: 'product', query: { uuid: 'uuid-99' } },
     *   ],
     *   fallback: async (misses) => {
     *     const uuids = misses.map(m => m.originalArg.query.uuid);
     *     const rows  = await prisma.product.findMany({ where: { uuid: { in: uuids } } });
     *     return rows.map(r => ({
     *       logicalKey: misses.find(m => m.originalArg.query.uuid === r.uuid)!.logicalKey,
     *       data: mapRowToProductI(r),
     *     }));
     *   },
     *   options: { ttl: 20 * 60 * 1000, staleTime: 15 * 60 * 1000 },
     * });
     * // data   → ProductI[]  (resolved entries in original order)
     * // misses → string[]    (logical keys with no data anywhere)
     */
    async getMultipleDataWithFallback<T>(args: {
        where: { entity: string; query?: any }[];
        fallback: (
            misses: { logicalKey: string; originalArg: { entity: string; query?: any } }[]
        ) => Promise<{ logicalKey: string; data: T }[]>;
        options?: {
            ttl?: number;
            staleTime?: number;
            jitter?: boolean;
        };
    }): Promise<{ data: T[]; misses: string[] }> {
        const { where, fallback, options } = args;

        if (where.length === 0) return { data: [], misses: [] };

        // ── Phase 1: resolve all version keys in one MGET ─────────────────────
        const versionKeysPerArg = where.map((arg) => ({
            entityKey: this.versionRedisKey(this.buildEntityVersionKey(arg.entity)),
            queryKey: arg.query
                ? this.versionRedisKey(this.buildVersionKey(arg.entity, arg.query))
                : null,
        }));

        const uniqueVersionKeys = [
            ...new Set(
                versionKeysPerArg.flatMap(({ entityKey, queryKey }) =>
                    queryKey ? [entityKey, queryKey] : [entityKey]
                )
            ),
        ];

        const versionRaws = await this.redis.mget(...uniqueVersionKeys);
        const versionMap = new Map<string, number>();
        uniqueVersionKeys.forEach((key, i) => {
            const raw = versionRaws[i];
            versionMap.set(key, raw === null ? 1 : (parseInt(raw, 10) || 1));
        });

        const keyEntries = where.map((arg, i) => {
            const { entityKey, queryKey } = versionKeysPerArg[i];
            const entityVersion = versionMap.get(entityKey)!;
            const queryVersion = queryKey ? versionMap.get(queryKey)! : entityVersion;
            return this.buildCacheKey({ entity: arg.entity, queryVersion, entityVersion, query: arg.query });
        });

        // ── Phase 2: fetch all data keys in one MGET ──────────────────────────
        const namespacedKeys = keyEntries.map(k => this.dataCacheKey(k));
        const raws = await this.redis.mget(...namespacedKeys);

        // ── Phase 3: classify hits vs misses ──────────────────────────────────
        const results = new Map<string, T>();
        const missDescriptors: { logicalKey: string; originalArg: { entity: string; query?: any } }[] = [];

        for (let i = 0; i < keyEntries.length; i++) {
            const entry = this.deserialize<CacheInterface<T>>(raws[i]);
            if (entry !== null) {
                results.set(keyEntries[i], entry.data);
            } else {
                missDescriptors.push({ logicalKey: keyEntries[i], originalArg: where[i] });
            }
        }

        // ── Phase 4: distributed locking for misses ───────────────────────────
        if (missDescriptors.length > 0) {
            const useJitter = options?.jitter ?? true;
            const baseTtl = options?.ttl ?? 300_000;
            const ttl = useJitter ? this.applyJitter(0.2, baseTtl) : baseTtl;
            const staleTime = options?.staleTime ?? (ttl !== undefined ? ttl * 0.9 : undefined);

            const LOCK_TTL_MS = 10_000;
            const FOLLOWER_WAIT_MS = 5_000;
            const lockValue = randomUUID();

            // Per-key lock attempts in parallel — fine-grained, so overlapping
            // miss sets from different requests don't block each other entirely.
            const lockResults = await Promise.all(
                missDescriptors.map(({ logicalKey }) =>
                    this.redis.call(
                        'SET', `lock:multiget:${logicalKey}`,
                        lockValue, 'NX', 'PX', LOCK_TTL_MS
                    ) as Promise<string | null>
                )
            );

            const leaderMisses: typeof missDescriptors = [];
            const followerMisses: typeof missDescriptors = [];

            missDescriptors.forEach((descriptor, i) => {
                (lockResults[i] === 'OK' ? leaderMisses : followerMisses).push(descriptor);
            });

            // ── Leader path ───────────────────────────────────────────────────
            if (leaderMisses.length > 0) {
                try {
                    const hydratedMisses = await fallback(leaderMisses);

                    for (const { logicalKey, data } of hydratedMisses) {
                        results.set(logicalKey, data);
                        const now = Date.now();
                        const cacheEntry: CacheInterface<T> = {
                            data,
                            metadata: {
                                ttl,
                                staleTime: staleTime?.toString(),
                                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                                createdAt: new Date(now).toISOString(),
                                expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                                strategy: 'settedData',
                                hitCount: 0,
                            },
                        };
                        // Intentional await — followers read from Redis after lock release.
                        await this.redisSet(logicalKey, cacheEntry, ttl);
                    }
                } finally {
                    await Promise.all(
                        leaderMisses.map(({ logicalKey }) =>
                            this.releaseLock(`lock:multiget:${logicalKey}`, lockValue)
                        )
                    );
                }
            }

            // ── Follower path ─────────────────────────────────────────────────
            if (followerMisses.length > 0) {
                const followerResults = await Promise.all(
                    followerMisses.map(({ logicalKey }) =>
                        this.waitForMissToPopulate<T>(logicalKey, FOLLOWER_WAIT_MS)
                    )
                );

                const timedOutMisses: typeof missDescriptors = [];

                followerMisses.forEach(({ logicalKey, originalArg }, i) => {
                    const data = followerResults[i];
                    if (data !== null) {
                        results.set(logicalKey, data);
                    } else {
                        timedOutMisses.push({ logicalKey, originalArg });
                    }
                });

                // Defensive fallback: leader timed out or crashed.
                if (timedOutMisses.length > 0) {
                    console.warn(
                        `[CacheService] ${timedOutMisses.length} follower(s) timed out — calling fallback defensively`
                    );
                    const defensive = await fallback(timedOutMisses);
                    for (const { logicalKey, data } of defensive) {
                        results.set(logicalKey, data);
                        const now = Date.now();
                        const cacheEntry: CacheInterface<T> = {
                            data,
                            metadata: {
                                ttl,
                                staleTime: staleTime?.toString(),
                                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                                createdAt: new Date(now).toISOString(),
                                expiresAt: ttl ? new Date(now + ttl).toISOString() : undefined,
                                strategy: 'settedData',
                                hitCount: 0,
                            },
                        };
                        this.redisSet(logicalKey, cacheEntry, ttl).catch(err =>
                            console.error(`[CacheService] Defensive SET failed for key ${logicalKey}:`, err)
                        );
                    }
                }
            }
        }

        // ── Phase 5: merge in original order, collect persistent misses ───────
        // A persistent miss is a key that went through the full lifecycle
        // (Redis miss → fallback → defensive fallback) and still has no data.
        // This signals that the source of truth has no record for that key.
        const persistentMisses = missDescriptors
            .filter(d => !results.has(d.logicalKey))
            .map(d => d.logicalKey);

        const data = keyEntries
            .map(key => results.get(key))
            .filter((item): item is T => item !== null && item !== undefined);

        return { data, misses: persistentMisses };
    }



    /**
     * Removes a specific cache entry.
     * Returns true if the entry existed and was removed, false otherwise.
     *
     * @param args.entity - Entity name.
     * @param args.query  - Optional query parameters identifying the cached entry.
     *
     * @example
     * await cacheService.removeData({ entity: 'products' });
     *
     * @example
     * await cacheService.removeData({ entity: 'products', query: { category: 'electronics' } });
     */
    async removeData(args: {
        entity: string,
        query?: any
    }): Promise<boolean> {
        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });
        return this.redisDel(key);
    }

    /**
     * Updates specific fields in cached data without overwriting the entire object.
     * Performs a shallow merge of the existing cached data with the provided partial data.
     * Returns null when no cache entry exists for the given key.
     *
     * @param args.entity           - Entity name.
     * @param args.query            - Optional query parameters identifying the cached entry.
     * @param args.data             - Partial data to merge into the existing cached object.
     * @param args.aditionalOptions - Optional TTL configuration.
     * @returns Merged data, or null if the cache entry does not exist.
     *
     * @example
     * const updated = await cacheService.updateData({
     *   entity: 'product',
     *   query: { id: '123' },
     *   data: { price: 29.99 }
     * });
     */
    async updateData<T>(args: {
        entity: string,
        query?: any,
        data: Partial<T>,
        aditionalOptions?: {
            ttlMilliseconds?: number,
            staleTimeMilliseconds?: number,
            enabledJitter?: boolean,
            resetTTL?: boolean
        }
    }): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required to update cache data");

        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.redisGet<T>(key);
        if (!cached) {
            console.warn(`[CacheService] Cannot update: no cached data found for key ${key}`);
            return null;
        }

        const updatedData = { ...cached.data, ...args.data } as T;

        let finalTtl: number | undefined;

        if (args.aditionalOptions?.resetTTL) {
            const baseTtl = args.aditionalOptions?.ttlMilliseconds ?? 300_000;
            const useJitter = args.aditionalOptions?.enabledJitter ?? true;
            finalTtl = useJitter ? this.applyJitter(0.2, baseTtl) : baseTtl;
        } else {
            // Preserve actual remaining expiry rather than resetting to the
            // original TTL stored in metadata.
            const remainingMs = await this.redis.pttl(this.dataCacheKey(key));
            finalTtl = remainingMs > 0 ? remainingMs : cached.metadata.ttl;
        }

        // Bug fixed: same staleTime=0 default replaced with undefined.
        const staleTime: number | undefined = args.aditionalOptions?.staleTimeMilliseconds
            ?? (finalTtl !== undefined ? finalTtl * 0.9 : undefined);

        const now = Date.now();

        const updatedCacheData: CacheInterface<T> = {
            data: updatedData,
            metadata: {
                ...cached.metadata,
                ttl: finalTtl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                expiresAt: finalTtl ? new Date(now + finalTtl).toISOString() : undefined,
            }
        };

        await this.redisSet(key, updatedCacheData, finalTtl);
        return updatedData;
    }

    /**
     * Updates cached data using a transformer function.
     * Allows complex or conditional transformations that cannot be expressed as a partial merge.
     * Returns null when no cache entry exists for the given key.
     *
     * @param args.entity       - Entity name.
     * @param args.query        - Optional query parameters identifying the cached entry.
     * @param args.transformer  - Function that receives the current data and returns updated data.
     * @param args.aditionalOptions - Optional TTL configuration.
     * @returns Transformed data, or null if the cache entry does not exist.
     *
     * @example
     * const updated = await cacheService.updateDataWithTransformer({
     *   entity: 'stats',
     *   query: { type: 'views' },
     *   transformer: (current) => ({ ...current, count: current.count + 1 })
     * });
     */
    async updateDataWithTransformer<T>(args: {
        entity: string,
        query?: any,
        transformer: (currentData: T) => T | Promise<T>,
        aditionalOptions?: {
            ttlMilliseconds?: number,
            staleTimeMilliseconds?: number,
            enabledJitter?: boolean,
            resetTTL?: boolean
        }
    }): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required to update cache data");

        const { queryVersion, entityVersion } = await this.getVersionsBatch(args.entity, args.query);

        const key = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.redisGet<T>(key);
        if (!cached) {
            console.warn(`[CacheService] Cannot update: no cached data found for key ${key}`);
            return null;
        }

        const updatedData = await Promise.resolve(args.transformer(cached.data));

        let finalTtl: number | undefined;

        if (args.aditionalOptions?.resetTTL) {
            const baseTtl = args.aditionalOptions?.ttlMilliseconds ?? 300_000;
            const useJitter = args.aditionalOptions?.enabledJitter ?? true;
            finalTtl = useJitter ? this.applyJitter(0.2, baseTtl) : baseTtl;
        } else {
            const remainingMs = await this.redis.pttl(this.dataCacheKey(key));
            finalTtl = remainingMs > 0 ? remainingMs : cached.metadata.ttl;
        }

        // Bug fixed: same staleTime=0 default replaced with undefined.
        const staleTime: number | undefined = args.aditionalOptions?.staleTimeMilliseconds
            ?? (finalTtl !== undefined ? finalTtl * 0.9 : undefined);

        const now = Date.now();

        const updatedCacheData: CacheInterface<T> = {
            data: updatedData,
            metadata: {
                ...cached.metadata,
                ttl: finalTtl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                expiresAt: finalTtl ? new Date(now + finalTtl).toISOString() : undefined,
            }
        };

        await this.redisSet(key, updatedCacheData, finalTtl);
        return updatedData;
    }
}