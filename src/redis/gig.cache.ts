import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL } from "@gig/config";
import { Logger } from "winston";
import { client } from "@gig/redis/redis.connection";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigRedisConnection",
    "debug"
);

export async function getUserSelectedGigCategory(key: string): Promise<string> {
    try {
        if (!client.isOpen) {
            await client.connect();
        }

        const response = (await client.GET(key)) as string;

        return response;
    } catch (error) {
        log.error(
            "GigService GigCache getUserSelectedGigCategory() method error:",
            error
        );
        return "";
    }
}
