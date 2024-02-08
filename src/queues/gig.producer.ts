import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL } from "@gig/config";
import { Channel } from "amqplib";
import { Logger } from "winston";
import { createConnection } from "@gig/queues/connection";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigServiceProducer",
    "debug"
);

export async function publishDirectMessage(
    channel: Channel,
    exchangeName: string,
    routingKey: string,
    message: string,
    logMessage: string
): Promise<void> {
    try {
        if (!channel) {
            channel = (await createConnection()) as Channel;
        }

        await channel.assertExchange(exchangeName, "direct");
        channel.publish(exchangeName, routingKey, Buffer.from(message));
        log.info(logMessage);
    } catch (error) {
        log.error(
            "GigService QueueProducer publishDirectMessage() method error:",
            error
        );
    }
}
