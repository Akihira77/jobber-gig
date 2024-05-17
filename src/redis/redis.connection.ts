import { logger, REDIS_HOST } from "@gig/config";
import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;
export const redisClient: RedisClient = createClient({ url: `${REDIS_HOST}` });

export async function redisConnect(): Promise<void> {
    try {
        await redisClient.connect();
        if (redisClient.isReady) {
            logger("redis/redis.connection() - redisConnect()").info(
                `GigService Redis Connected: ${redisClient.isReady}`
            );
        }
        catchError();
    } catch (error) {
        logger("redis/redis.connection() - redisConnect()").error(
            "GigService redisConnect() method error:",
            error
        );
    }
}

function catchError(): void {
    redisClient.on("error", (error: unknown) => {
        logger("redis/redis.connection() - redisConnect()").error(error);
    });
}
