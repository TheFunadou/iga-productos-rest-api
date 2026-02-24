import { Inject, Injectable } from '@nestjs/common';
import { CacheFactoryService } from './cache.factory';
import { createHash } from 'crypto';
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

    // ==================== PRIVATE: VERSION MANAGEMENT ====================

    /**
     * Retrieves the current version number for an entity/query.
     * Defaults to 1 when the version key does not yet exist.
     * @param entity - Entity name.
     * @param query  - Optional query parameters.
     * @returns Current version number.
     */
    private async getVersion(entity: string, query?: any): Promise<number> {
        const rKey = this.versionRedisKey(this.buildVersionKey(entity, query));
        const raw = await this.redis.get(rKey);
        if (raw === null) return 1;
        const parsed = parseInt(raw, 10);
        return isNaN(parsed) ? 1 : parsed;
    }

    /**
     * Retrieves the current entity-level version number.
     * Defaults to 1 when the version key does not yet exist.
     * @param entity - Entity name.
     * @returns Current entity version number.
     */
    private async getEntityVersion(entity: string): Promise<number> {
        const rKey = this.versionRedisKey(this.buildEntityVersionKey(entity));
        const raw = await this.redis.get(rKey);
        if (raw === null) return 1;
        const parsed = parseInt(raw, 10);
        return isNaN(parsed) ? 1 : parsed;
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
        const current = await this.getEntityVersion(entity);
        await this.redis.set(rKey, String(current + 1), "PX", 1000 * 60 * 60 * 24 * 7);
    }

    /**
     * Increments the query-level version counter for an entity/query combination.
     * Effectively invalidates the cached result for that specific query.
     * @param entity - Entity name.
     * @param query  - Query parameters.
     */
    private async incrementVersion(entity: string, query: any): Promise<void> {
        const rKey = this.versionRedisKey(this.buildVersionKey(entity, query));
        const current = await this.getVersion(entity, query);
        await this.redis.set(rKey, String(current + 1), "PX", 1000 * 60 * 60 * 24 * 7);
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

        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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
        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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

        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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
        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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

        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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

        const queryVersion = await this.getVersion(args.entity, args.query);
        const entityVersion = await this.getEntityVersion(args.entity);
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