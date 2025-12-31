
/**
 * Interface representing the structure of data stored in the cache.
 * Wraps the actual data with metadata for versioning, TTL, and stale-while-revalidate logic.
 */
export interface CacheInterface<T> {
    /** The actual cached data */
    data: T,
    /** Metadata used for cache management */
    metadata: {
        /** Time-To-Live in milliseconds */
        ttl?: number,
        /** Time (as string) when the data is considered stale */
        staleTime?: string,
        /** ISO timestamp when the data becomes stale */
        staleAt?: string,
        /** ISO timestamp when the cache entry was created */
        createdAt: string,
        /** ISO timestamp when the cache entry expires (hard expiry) */
        expiresAt?: string,
        /** Name of the strategy used to cache this data */
        strategy: string,
        /** Number of times this cache entry has been hit */
        hitCount: number
    }
};