import { exchangeNamesAndRoutingKeys } from "@gig/config";
import { publishDirectMessage } from "@gig/queues/gig.producer";
import { gigChannel } from "@gig/server";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export async function gigs(req: Request, res: Response): Promise<void> {
    const count = req.params.count;
    const { gigService } = exchangeNamesAndRoutingKeys;

    await publishDirectMessage(
        gigChannel,
        gigService.getSellers.exchangeName,
        gigService.getSellers.routingKey,
        JSON.stringify({ type: "getSellers", count }),
        "Gig seed message sent to users service."
    );

    res.status(StatusCodes.CREATED).json({
        message: "Seed gigs successfully,"
    });
}
