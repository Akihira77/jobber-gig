import { logger, REDIS_HOST } from "@gig/config";
import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;
export const redisClient: RedisClient = createClient({ url: `${REDIS_HOST}` });

export async function redisConnect(): Promise<void> {
    try {
        await redisClient.connect();
        if (redisClient.isReady) {
            logger.info(`GigService Redis Connected: ${redisClient.isReady}`);
        }
        catchError();
    } catch (error) {
        logger.error("GigService redisConnect() method error:", error);
    }
}

function catchError(): void {
    redisClient.on("error", (error: unknown) => {
        logger.error(error);
    });
}
