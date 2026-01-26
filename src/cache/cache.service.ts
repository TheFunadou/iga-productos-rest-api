import { Inject, Injectable } from '@nestjs/common';
import Keyv from 'keyv';
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
 * - **Version-based invalidation**: Allows invalidating entire entities or specific queries.
 * - **Multiple strategies**: Supports Simple, Stale-While-Revalidate, and Distributed Locking.
 * - **Jitter**: Prevents cache stampedes by adding randomness to TTLs.
 * - **Query-hashing**: Deterministically generates keys from query objects.
 */
@Injectable()
export class CacheService {

    constructor(
        @Inject("KEYV_CACHE") private readonly keyv: Keyv,
        private readonly cacheFactory: CacheFactoryService,
        @Inject("REDIS_CLIENT") private readonly cacheClient: Redis
    ) { };

    // ==================== PRIVATE: KEY GENERATION ====================

    /**
     * Generates an MD5 hash from a query object
     * @param query - Query object to hash
     * @returns MD5 hash string
     */
    private buildHashedKey(query: any): string {
        return createHash("md5").update(JSON.stringify(query)).digest("hex");
    };

    /**
     * Builds a version key for an entity/query combination
     * @param entity - Entity name
     * @param query - Optional query parameters
     * @returns Version key string (e.g., "products:version" or "products:version:abc123")
     */
    private buildVersionKey(entity: string, query?: any): string {
        if (!query) return `${entity}:version`;
        const hash = this.buildHashedKey(query);
        return `${entity}:version:${hash}`;
    };

    /**
     * Builds a version key for an entity
     * @param entity - Entity name
     * @returns Version key string (e.g., "products:entity:version")
     */
    private buildEntityVersionKey(entity: string): string {
        return `${entity}:version`;
    };

    /**
     * Builds a cache key with version number
     * @param args - Object containing entity name, query version, entity version, and optional query parameters
     * @returns Cache key string (e.g., "products:v2" or "products:abc123:v2")
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
    };

    // ==================== PRIVATE: VERSION MANAGEMENT ====================

    /**
     * Retrieves the current version number for an entity/query
     * @param entity - Entity name
     * @param query - Optional query parameters
     * @returns Current version number (defaults to 1 if not found)
     */
    private async getVersion(entity: string, query?: any): Promise<number> {
        const key = this.buildVersionKey(entity, query);
        const version = await this.keyv.get(key);
        return version ?? 1;
    };

    /**
     * Retrieves the current version number for an entity
     * @param entity - Entity name
     * @returns Current version number (defaults to 1 if not found)
     */
    private async getEntityVersion(entity: string): Promise<number> {
        const key = this.buildEntityVersionKey(entity);
        const version = await this.keyv.get(key);
        return version ?? 1;
    };

    /**
     * Increments the version number for an entity
     * This effectively invalidates all cached data for that version
     * @param entity - Entity name
     */
    private async incrementEntityVersion(entity: string): Promise<void> {
        const key = this.buildEntityVersionKey(entity);
        const current = await this.getEntityVersion(entity);
        await this.keyv.set(key, current + 1, 1000 * 60 * 60 * 24 * 7);
    };


    /**
     * Increments the version number for an entity/query
     * This effectively invalidates all cached data for that version
     * @param entity - Entity name
     * @param query - Optional query parameters
     */
    private async incrementVersion(entity: string, query: any): Promise<void> {
        const key = this.buildVersionKey(entity, query);
        const version = await this.getVersion(entity, query);
        // Version keys expire after 7 days to prevent indefinite accumulation
        // while avoiding premature expiration that could cause version resets
        await this.keyv.set(key, version + 1, 1000 * 60 * 60 * 24 * 7);
    };

    // ==================== PRIVATE: TTL UTILITIES ====================

    /**
     * Applies jitter to a TTL value to prevent cache stampede
     * @param jitterFactor - Jitter factor (default: 0.2 = ±20%)
     * @param ttlMiliseconds - Base TTL in milliseconds
     * @returns TTL with jitter applied, or undefined if no TTL provided
     */
    private applyJitter(jitterFactor: number = 0.2, ttlMiliseconds?: number): number | undefined {
        if (!ttlMiliseconds) return undefined;
        const delta = ttlMiliseconds * jitterFactor * (Math.random() - 0.5);
        return Math.floor(Math.max(ttlMiliseconds + delta, 1));
    }

    // ==================== PUBLIC: INVALIDATION ====================

    /**
     * Invalidates cached data for a specific entity/query combination
     * 
     * @param entity - Entity name to invalidate
     * @param query - Optional query parameters to invalidate specific cached queries
     * 
     * @example
     * // Invalidate all products
     * await cacheService.invalidateQuery('products');
     * 
     * @example
     * // Invalidate products with specific query
     * await cacheService.invalidateQuery('products', { category: 'electronics' });
     */
    async invalidateQuery(args: { entity: string, query: any }): Promise<void> {
        await this.incrementVersion(args.entity, args.query);
    };

    /**
     * Invalidates cached data for a specific entity
     * 
     * @param entity - Entity name to invalidate
     * 
     * @example
     * // Invalidate all products
     * await cacheService.invalidateEntity('products');
     */
    async invalidateEntity(args: { entity: string }): Promise<void> {
        await this.incrementEntityVersion(args.entity);
    };

    /**
     * Invalidates multiple entities in parallel
     * 
     * @param args - Array of objects containing entity name to invalidate
     * 
     * @example
     * await cacheService.invalidateMultipleEntities([
     *   { entity: 'products' },
     *   { entity: 'users' }
     * ]);
     */
    async invalidateMultipleEntities(args: { entity: string }[]): Promise<void> {
        await Promise.all(
            args.map(entity => this.invalidateEntity({ entity: entity.entity }))
        );
    };

    /**
     * Invalidates multiple queries for an entity in parallel
     * 
     * @param args - Array of objects containing entity name and query parameters to invalidate
     * 
     * @example
     * await cacheService.invalidateMultipleQueries([
     *   { entity: 'products', query: { category: 'electronics' } },
     *   { entity: 'products', query: { category: 'clothing' } },
     * ]);
     */
    async invalidateMultipleQueries(args: { entity: string, query: any }[]): Promise<void> {
        await Promise.all(
            args.map(query => this.invalidateQuery({ entity: query.entity, query: query.query }))
        );
    };

    // ==================== PUBLIC: CACHE OPERATIONS ====================

    /**
     * Retrieves data from cache or executes fallback function if cache miss
     * Supports version-based invalidation and configurable cache strategies
     * 
     * @param args - Configuration object containing:
     *   - type: Cache strategy ("simpleFind" | "staleWhileRevalidate")
     *   - entity: Entity name for cache key generation
     *   - query: Optional query parameters to include in cache key
     *   - aditionalOptions: Optional TTL and jitter configuration
     *   - fallback: Function to execute on cache miss
     * @returns Cached or freshly fetched data
     * 
     * @example
     * // Simple cache with defaults (5 min TTL, jitter enabled)
     * const users = await cacheService.remember<User[]>({
     *   type: "staleWhileRevalidate",
     *   entity: "users",
     *   query: { all: true },
     *   fallback: async () => this.usersRepo.find()
     * });
     * 
     * @example
     * // Custom TTL and no jitter
     * const product = await cacheService.remember<Product>({
     *   type: "simpleFind",
     *   entity: "product:123",
     *   aditionalOptions: {
     *     ttlMilliseconds: 3600000, // 1 hour
     *     enabledJitter: false
     *   },
     *   fallback: async () => this.productsRepo.findOne({ where: { id: "123" } })
     * });
     * 
     * @example
     * // No TTL (cache never expires)
     * const config = await cacheService.remember<Config>({
     *   type: "simpleFind",
     *   entity: "config",
     *   aditionalOptions: {
     *     ttlMilliseconds: undefined
     *   },
     *   fallback: async () => this.configRepo.findOne()
     * });
     */
    async remember<T>(
        args: {
            method: "simpleFind" | "staleWhileRevalidate" | "cacheLocking" | "staleWhileRevalidateWithLock", // AGREGAR "cacheLocking"
            entity: string,
            query?: any,
            aditionalOptions?: {
                ttlMilliseconds?: number,
                staleTimeMilliseconds?: number,
                enabledJitter?: boolean,
            },
            fallback: () => Promise<T>
        }
    ): Promise<T> {
        if (!args.entity) throw new Error("Entity is required in CacheOptions");

        // Apply defaults for aditionalOptions
        const defaultOptions = {
            enabledJitter: true,
            ttlMilliseconds: 300000 // 5 minutes default
        };

        const finalOptions = { ...defaultOptions, ...args.aditionalOptions };

        // Calculate TTL with or without jitter
        const ttl: number | undefined = finalOptions.enabledJitter
            ? this.applyJitter(0.2, finalOptions.ttlMilliseconds)
            : finalOptions.ttlMilliseconds;

        // Calc staleTime
        const staleTime = args.aditionalOptions?.staleTimeMilliseconds ?? (ttl ? ttl * 0.9 : 0);

        // Get current version and build cache key
        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        // Delegate to cache strategy
        return this.cacheFactory.findData<T>({
            type: args.method,
            keyvInstance: this.keyv,
            key,
            ttl,
            staleTime
        }, args.fallback);
    };


    /**
     * Sets data in cache with version-based invalidation and configurable TTL
     * 
     * @param args - Configuration object containing:
     *   - entity: Entity name for cache key generation
     *   - query: Optional query parameters to include in cache key
     *   - data: Data to store in cache
     *   - aditionalOptions: Optional TTL and jitter configuration
     * 
     * @example
     * // Set data with defaults (5 min TTL, jitter enabled)
     * await cacheService.setData({
     *   entity: "product:123",
     *   data: { name: "Product 123", price: 19.99 }
     * });
     * 
     * @example
     * // Set data with query and custom options
     * await cacheService.setData({
     *   entity: "user:permissions",
     *   query: { uuid: "abc-123" },
     *   data: { USERS: ["READ", "UPDATE"] },
     *   aditionalOptions: {
     *     ttlMilliseconds: 3600000, // 1 hour
     *     enabledJitter: false
     *   }
     * });
     */
    async setData<T>(
        args: {
            entity: string,
            query?: any,
            data: T,
            aditionalOptions?: {
                enabledJitter?: boolean,
                ttlMilliseconds?: number,
                staleTimeMilliseconds?: number
            }
        }
    ): Promise<void> {
        if (!args.entity) throw new Error("Entity es requerido para guardar datos en cache");

        // Apply defaults for aditionalOptions
        const defaultOptions = {
            enabledJitter: true,
            ttlMilliseconds: 300000 // 5 minutes default
        };

        const finalOptions = { ...defaultOptions, ...args.aditionalOptions };

        // Calculate TTL with or without jitter
        const ttl: number | undefined = finalOptions.enabledJitter
            ? this.applyJitter(0.2, finalOptions.ttlMilliseconds)
            : finalOptions.ttlMilliseconds;

        const staleTime = args.aditionalOptions?.staleTimeMilliseconds ?? (ttl ? ttl * 0.9 : 0);
        const now = Date.now();

        // Get current version and build cache key
        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const formatedData: CacheInterface<T> = {
            data: args.data,
            metadata: {
                ttl,
                staleTime: staleTime?.toString(),
                staleAt: staleTime ? new Date(now + staleTime).toISOString() : undefined,
                createdAt: new Date().toISOString(),
                expiresAt: ttl ? new Date(Date.now() + ttl).toISOString() : undefined,
                strategy: "settedData",
                hitCount: 0
            }
        };

        const result = await this.keyv.set(key, formatedData, ttl);
        if (!result) throw new Error("Error al guardar los datos en cache");
    };
    /**
     * Retrieves data from cache based on entity and query (without fallback)
     * Returns null if data is not found in cache
     * 
     * @param args - Configuration object containing:
     *   - entity: Entity name to retrieve
     *   - query: Optional query parameters to retrieve specific cached queries
     * @returns Cached data or null if not found
     * 
     * @example
     * // Retrieve all products
     * const products = await cacheService.getData<Product[]>({
     *   entity: 'products'
     * });
     * 
     * @example
     * // Retrieve products with specific query
     * const products = await cacheService.getData<Product[]>({
     *   entity: 'products',
     *   query: { category: 'electronics' }
     * });
     */
    async getData<T>(
        args: {
            entity: string,
            query?: any
        }
    ): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required in CacheOptions");

        // Get current version and build cache key
        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.keyv.get<CacheInterface<T>>(key);

        if (cached) {
            // Incrementar hitCount
            cached.metadata.hitCount++;
            // Actualizar en caché para persistir el nuevo hitCount
            // Se usa el TTL original guardado en los metadatos
            await this.keyv.set(key, cached, cached.metadata.ttl);

            return cached.data;
        }

        return null;
    };

    /**
     * Removes data from cache based on entity and query
     * 
     * @param args - Configuration object containing:
     *   - entity: Entity name to remove
     *   - query: Optional query parameters to remove specific cached queries
     * @returns true if data was removed, false if not found
     * 
     * @example
     * // Remove all products
     * await cacheService.removeData({
     *   entity: 'products'
     * });
     * 
     * @example
     * // Remove products with specific query
     * await cacheService.removeData({
     *   entity: 'products',
     *   query: { category: 'electronics' }
     * });
     */
    async removeData(
        args: {
            entity: string,
            query?: any
        }): Promise<boolean> {
        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });
        const removed: boolean = await this.keyv.delete(key);
        if (removed) return true;
        return false;
    };


    /**
 * Updates specific fields in cached data without overwriting the entire object
 * Performs a partial update (merge) of the cached data
 * 
 * @param args - Configuration object containing:
 *   - entity: Entity name to update
 *   - query: Optional query parameters to identify the cached entry
 *   - data: Partial data to merge with existing cached data
 *   - aditionalOptions: Optional TTL configuration
 * @returns Updated data or null if cache entry doesn't exist
 * 
 * @example
 * // Update product price without affecting other fields
 * const updated = await cacheService.updateData({
 *   entity: 'product',
 *   query: { id: '123' },
 *   data: { price: 29.99 }
 * });
 */
    async updateData<T>(
        args: {
            entity: string,
            query?: any,
            data: Partial<T>,
            aditionalOptions?: {
                ttlMilliseconds?: number,
                staleTimeMilliseconds?: number,
                enabledJitter?: boolean,
                resetTTL?: boolean // Si true, reinicia el TTL; si false, mantiene el original
            }
        }
    ): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required to update cache data");

        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.keyv.get<CacheInterface<T>>(key);

        if (!cached) {
            console.warn(`[CacheService] Cannot update: no cached data found for key ${key}`);
            return null;
        }

        // Merge existing data with new data
        const updatedData: T = {
            ...cached.data,
            ...args.data
        } as T;

        // Determine TTL behavior
        let finalTtl: number | undefined;

        if (args.aditionalOptions?.resetTTL) {
            const defaultOptions = {
                enabledJitter: args.aditionalOptions?.enabledJitter ?? true,
                ttlMilliseconds: args.aditionalOptions?.ttlMilliseconds ?? 300000
            };

            finalTtl = defaultOptions.enabledJitter
                ? this.applyJitter(0.2, defaultOptions.ttlMilliseconds)
                : defaultOptions.ttlMilliseconds;
        } else {
            finalTtl = cached.metadata.ttl;
        }

        const staleTime = args.aditionalOptions?.staleTimeMilliseconds
            ?? (finalTtl ? finalTtl * 0.9 : 0);

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

        const result = await this.keyv.set(key, updatedCacheData, finalTtl);

        if (!result) {
            throw new Error("Error updating cache data");
        }

        return updatedData;
    };

    /**
     * Updates cached data using a transformer function
     * Allows complex transformations and conditional updates
     * 
     * @param args - Configuration object containing:
     *   - entity: Entity name to update
     *   - query: Optional query parameters to identify the cached entry
     *   - transformer: Function that receives current data and returns updated data
     *   - aditionalOptions: Optional TTL configuration
     * @returns Updated data or null if cache entry doesn't exist
     * 
     * @example
     * // Increment a counter
     * const updated = await cacheService.updateDataWithTransformer({
     *   entity: 'stats',
     *   query: { type: 'views' },
     *   transformer: (current) => ({
     *     ...current,
     *     count: current.count + 1
     *   })
     * });
     */
    async updateDataWithTransformer<T>(
        args: {
            entity: string,
            query?: any,
            transformer: (currentData: T) => T | Promise<T>,
            aditionalOptions?: {
                ttlMilliseconds?: number,
                staleTimeMilliseconds?: number,
                enabledJitter?: boolean,
                resetTTL?: boolean
            }
        }
    ): Promise<T | null> {
        if (!args.entity) throw new Error("Entity is required to update cache data");

        const queryVersion: number = await this.getVersion(args.entity, args.query);
        const entityVersion: number = await this.getEntityVersion(args.entity);
        const key: string = this.buildCacheKey({
            entity: args.entity,
            queryVersion,
            entityVersion,
            query: args.query
        });

        const cached = await this.keyv.get<CacheInterface<T>>(key);

        if (!cached) {
            console.warn(`[CacheService] Cannot update: no cached data found for key ${key}`);
            return null;
        }

        const updatedData: T = await Promise.resolve(args.transformer(cached.data));

        let finalTtl: number | undefined;

        if (args.aditionalOptions?.resetTTL) {
            const defaultOptions = {
                enabledJitter: args.aditionalOptions?.enabledJitter ?? true,
                ttlMilliseconds: args.aditionalOptions?.ttlMilliseconds ?? 300000
            };

            finalTtl = defaultOptions.enabledJitter
                ? this.applyJitter(0.2, defaultOptions.ttlMilliseconds)
                : defaultOptions.ttlMilliseconds;
        } else {
            finalTtl = cached.metadata.ttl;
        }

        const staleTime = args.aditionalOptions?.staleTimeMilliseconds
            ?? (finalTtl ? finalTtl * 0.9 : 0);

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

        const result = await this.keyv.set(key, updatedCacheData, finalTtl);

        if (!result) {
            throw new Error("Error updating cache data");
        }

        return updatedData;
    };
};
