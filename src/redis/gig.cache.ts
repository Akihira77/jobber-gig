import { logger } from "@gig/config";
import { redisClient, redisConnect } from "@gig/redis/redis.connection";

export async function getUserSelectedGigCategory(key: string): Promise<string> {
    try {
        if (!redisClient.isOpen) {
            await redisConnect();
        }

        const response = (await redisClient.GET(key)) ?? "";

        return response;
    } catch (error) {
        logger("redis/gig.cache.ts - getUserSelectedGigCategory()").error(
            "GigService GigCache getUserSelectedGigCategory() method error:",
            (error as Error).message
        );
        return "";
    }
}
