import { Injectable } from "@nestjs/common";
import Keyv from "keyv";
import {
    CacheSimpleFind,
    CacheStrategy,
    StaleWhileRevalidateFind,
    CacheLockingFind,
    StaleWhileRevalidateWithLockFind
} from "./cache.strategy";
import Redis from "ioredis";

@Injectable()
export class CacheFactoryService {
    constructor(
        private readonly simpleFind: CacheSimpleFind,
        private readonly staleWhileRevalidate: StaleWhileRevalidateFind,
        private readonly cacheLocking: CacheLockingFind,
        private readonly staleWhileRevalidateWithLock: StaleWhileRevalidateWithLockFind
    ) { }

    /**
     * Selects and returns the appropriate cache strategy based on the provided type.
     * 
     * @param type - The name of the desired cache strategy.
     * @returns The selected CacheStrategy implementation.
     */
    createCacheStrategy(
        type: "simpleFind" | "staleWhileRevalidate" | "cacheLocking" | "staleWhileRevalidateWithLock"
    ): CacheStrategy {
        switch (type) {
            case 'cacheLocking': return this.cacheLocking;
            case 'simpleFind': return this.simpleFind;
            case 'staleWhileRevalidate': return this.staleWhileRevalidate;
            case 'staleWhileRevalidateWithLock': return this.staleWhileRevalidateWithLock;
            default: return this.simpleFind;
        }
    }

    /**
     * Executes the data finding process using the specified cache strategy.
     * 
     * @param options - Configuration options including type, key, and TTLs.
     * @param fallback - The function to call if data is not in cache (or needs revalidation).
     * @returns The data (from cache or fallback).
     */
    async findData<T>(
        options: {
            type: "simpleFind" | "staleWhileRevalidate" | "cacheLocking" | "staleWhileRevalidateWithLock",
            redis: Redis,
            key: string,
            ttl?: number,
            staleTime?: number
        },
        fallback: () => Promise<T>,
    ): Promise<T> {
        const strategy = this.createCacheStrategy(options.type);
        return strategy.execute(
            options.key,
            options.ttl,
            options.staleTime,
            fallback,
            options.redis
        );
    }
}