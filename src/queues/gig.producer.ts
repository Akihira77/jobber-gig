import { Channel } from "amqplib";
import { createConnection } from "@gig/queues/connection";
import { logger } from "@gig/config";

export async function publishDirectMessage(
    channel: Channel,
    exchangeName: string,
    routingKey: string,
    message: string,
    logMessage: string
): Promise<void> {
    try {
        if (!channel) {
            channel = await createConnection();
        }

        await channel.assertExchange(exchangeName, "direct");
        channel.publish(exchangeName, routingKey, Buffer.from(message));
        logger("queues/gig.producer.ts - publishDirectMessage()").info(
            logMessage
        );
    } catch (error) {
        logger("queues/gig.producer.ts - publishDirectMessage()").error(
            "GigService QueueProducer publishDirectMessage() method error:",
            error
        );
    }
}
