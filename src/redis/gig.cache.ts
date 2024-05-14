import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL } from "@gig/config";
import { Logger } from "winston";
import { redisClient, redisConnect } from "@gig/redis/redis.connection";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigRedisConnection",
    "debug"
);

export async function getUserSelectedGigCategory(key: string): Promise<string> {
    try {
        if (!redisClient.isOpen) {
            await redisConnect();
        }

        const response = (await redisClient.GET(key)) ?? "";

        return response;
    } catch (error) {
        log.error(
            "GigService GigCache getUserSelectedGigCategory() method error:",
            (error as Error).message
        );
        return "";
    }
}
