import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL, REDIS_HOST } from "@gig/config";
import { createClient } from "redis";
import { Logger } from "winston";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigRedisConnection",
    "debug"
);

export type RedisClient = ReturnType<typeof createClient>;
export const client: RedisClient = createClient({ url: `${REDIS_HOST}` });

export async function redisConnect(): Promise<void> {
    try {
        await client.connect();
        log.info(`GigService Redis Connection ${await client.ping()}`);

        catchError();
    } catch (error) {
        log.error("GigService redisConnect() method error:", error);
    }
}

function catchError(): void {
    client.on("error", (error: unknown) => {
        log.error(error);
    });
}
