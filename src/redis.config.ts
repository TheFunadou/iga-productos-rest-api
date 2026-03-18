import "dotenv/config";
import Redis from 'ioredis';
const redisPassword = process.env.REDIS_PASSWORD;

export const redisConfig = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: redisPassword || undefined
};


export const RedisProvider = {
    provide: 'REDIS_CLIENT',
    useFactory: () => {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            password: redisPassword || undefined
        });
    },
};

