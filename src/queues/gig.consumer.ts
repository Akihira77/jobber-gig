import { exchangeNamesAndRoutingKeys, logger } from "@gig/config";
import { createConnection } from "@gig/queues/connection";
import { Channel, ConsumeMessage } from "amqplib";
import { seedData, updateGigReview } from "@gig/services/gig.service";

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
            async (msg: ConsumeMessage | null) => {
                try {
                    const { type, gigReview } = JSON.parse(
                        msg!.content.toString()
                    );

                    if (type === "updateGigReview") {
                        await updateGigReview(gigReview);
                        channel.ack(msg!);
                        return;
                    }

                    channel.reject(msg!, false);
                } catch (error) {
                    channel.reject(msg!, false);

                    logger(
                        "queues/gig.consumer.ts - consumeGigDirectMessages()"
                    ).error(
                        "consuming message got errors. consumeSeedDirectMessages()",
                        error
                    );
                }
            }
        );
    } catch (error) {
        logger("queues/gig.consumer.ts - consumeGigDirectMessages()").error(
            "GigService consumeGigDirectMessages() method error:",
            error
        );
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
            async (msg: ConsumeMessage | null) => {
                try {
                    const { sellers, count } = JSON.parse(
                        msg!.content.toString()
                    );

                    await seedData(sellers, count);

                    channel.ack(msg!);
                } catch (error) {
                    channel.reject(msg!, false);

                    logger(
                        "queues/gig.consumer.ts - consumeSeedDirectMessages()"
                    ).error(
                        "consuming message go errors. consumeSeedDirectMessages()",
                        error
                    );
                }
            }
        );
    } catch (error) {
        logger("queues/gig.consumer.ts - consumeSeedDirectMessages()").error(
            "GigService consumeSeedDirectMessages() method error:",
            error
        );
    }
}
