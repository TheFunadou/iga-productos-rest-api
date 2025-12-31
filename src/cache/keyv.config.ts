import { createKeyv } from "@keyv/redis";
import Keyv from "keyv";
import { redisConfig } from "src/redis.config";

/**
 * Creates and configures a new Keyv instance backed by Redis.
 * 
 * @returns {Keyv} A configured Keyv instance.
 */
export function createKeyvInstance(): Keyv {
    const keyv = createKeyv(`redis://${redisConfig.host}:${redisConfig.port}`, {
        namespace: "igaProductos"
    });

    keyv.on("error", (error) => console.error("Error al conectar con valkey/redis ", error));
    return keyv;
};