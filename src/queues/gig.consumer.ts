import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL, exchangeNamesAndRoutingKeys } from "@gig/config";
import { Logger } from "winston";
import { createConnection } from "@gig/queues/connection";
import { Channel, ConsumeMessage } from "amqplib";
import { seedData, updateGigReview } from "@gig/services/gig.service";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigServiceConsumer",
    "debug"
);

export async function consumeGigDirectMessages(
    channel: Channel
): Promise<void> {
    try {
        if (!channel) {
            channel = (await createConnection()) as Channel;
        }
        const { gigService } = exchangeNamesAndRoutingKeys;
        const queueName = "gig-update-queue";

        await channel.assertExchange(
            gigService.updateGig.exchangeName,
            "direct"
        );

        const jobberQueue = await channel.assertQueue(queueName, {
            durable: true,
            autoDelete: false
        });

        await channel.bindQueue(
            jobberQueue.queue,
            gigService.updateGig.exchangeName,
            gigService.updateGig.routingKey
        );

        await channel.consume(
            jobberQueue.queue,
            async (message: ConsumeMessage | null) => {
                const { gigReview } = JSON.parse(message!.content.toString());

                await updateGigReview(JSON.parse(gigReview));
                channel.ack(message!);
            }
        );
    } catch (error) {
        log.error("GigService consumeGigDirectMessages() method error:", error);
    }
}

export async function consumeSeedDirectMessages(
    channel: Channel
): Promise<void> {
    try {
        if (!channel) {
            channel = (await createConnection()) as Channel;
        }
        const { gigService } = exchangeNamesAndRoutingKeys;
        const queueName = "seed-gig-queue";

        await channel.assertExchange(gigService.seed.exchangeName, "direct");

        const jobberQueue = await channel.assertQueue(queueName, {
            durable: true,
            autoDelete: false
        });

        await channel.bindQueue(
            jobberQueue.queue,
            gigService.seed.exchangeName,
            gigService.seed.routingKey
        );

        await channel.consume(
            jobberQueue.queue,
            async (message: ConsumeMessage | null) => {
                const { sellers, count } = JSON.parse(
                    message!.content.toString()
                );

                await seedData(sellers, count);

                channel.ack(message!);
            }
        );
    } catch (error) {
        log.error(
            "GigService consumeSeedDirectMessages() method error:",
            error
        );
    }
}
