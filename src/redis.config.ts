import "dotenv/config";
import Redis from 'ioredis';

export const redisConfig = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
};

export const RedisProvider = {
    provide: 'REDIS_CLIENT',
    useFactory: () => {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
        });
    },
};

