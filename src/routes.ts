import { Logger } from "winston";
import { Context, Hono, Next } from "hono";
import { NotAuthorizedError } from "@Akihira77/jobber-shared";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import { GigQueue } from "./queues/gig.queue";
import { GigService } from "./services/gig.service";
import { GigHandler } from "./handler/gig.handler";
import { ElasticSearchClient } from "./elasticsearch";
import { GATEWAY_JWT_TOKEN } from "./config";

const BASE_PATH = "/api/v1/gig";

export function appRoutes(
    app: Hono,
    queue: GigQueue,
    elastic: ElasticSearchClient,
    logger: (moduleName: string) => Logger
): void {
    app.get("gig-health", (c: Context) => {
        return c.text("Gig service is healthy and OK.", StatusCodes.OK);
    });

    const gigSvc = new GigService(queue, logger);
    const gigController = new GigHandler(gigSvc, elastic, queue, logger);

    const api = app.basePath(BASE_PATH);

    gigRoute(api, gigController);
    api.use(verifyGatewayRequest);
}

function gigRoute(
    api: Hono<Record<string, never>, Record<string, never>, typeof BASE_PATH>,
    gigHndlr: GigHandler
): void {
    api.get("/:gigId", async (c: Context) => {
        const gigId = c.req.param("gigId");
        const gig = await gigHndlr.getGigById.bind(gigHndlr)(gigId);

        return c.json(
            {
                message: "Get gig by id",
                gig
            },
            StatusCodes.OK
        );
    });
    api.get("/seller/:sellerId", async (c: Context) => {
        const sellerId = c.req.param("sellerId");
        const gigs =
            await gigHndlr.getSellerActiveGigs.bind(gigHndlr)(sellerId);

        return c.json(
            {
                message: "Seller active gigs",
                gigs
            },
            StatusCodes.OK
        );
    });
    api.get("/seller/inactive/:sellerId", async (c: Context) => {
        const sellerId = c.req.param("sellerId");
        const gigs =
            await gigHndlr.getSellerInactiveGigs.bind(gigHndlr)(sellerId);

        return c.json(
            {
                message: "Seller inactive gigs",
                gigs
            },
            StatusCodes.OK
        );
    });
    api.get("/search/:from/:size/:type", async (c: Context) => {
        const { from, size, type } = c.req.param();
        const { query, delivery_time, min, max } = c.req.query();

        const { resultHits, total } = await gigHndlr.getGigsQuerySearch.bind(
            gigHndlr
        )(
            { from, type, size: parseInt(size, 10) },
            query,
            delivery_time,
            parseInt(min, 10),
            parseInt(max, 10)
        );

        return c.json(
            {
                message: "Search gigs results",
                total: total,
                gigs: resultHits
            },
            StatusCodes.OK
        );
    });
    api.get("/category/:username", async (c: Context) => {
        const username = c.req.param("username");
        const gigs = await gigHndlr.getGigsByCategory.bind(gigHndlr)(username);

        return c.json(
            {
                message: "Search gigs category results",
                total: gigs.total,
                gigs
            },
            StatusCodes.OK
        );
    });
    api.get("/top/:username", async (c: Context) => {
        const username = c.req.param("username");
        const gigs =
            await gigHndlr.getTopRatedGigsByCategory.bind(gigHndlr)(username);

        return c.json(
            {
                message: "Search top gigs results",
                total: gigs.total,
                gigs
            },
            StatusCodes.OK
        );
    });
    api.get("/similar/:gigId", async (c: Context) => {
        const gigId = c.req.param("gigId");
        const gigs = await gigHndlr.getGigsMoreLikeThis.bind(gigHndlr)(gigId);

        return c.json(
            {
                message: "Search gigs more like this results",
                total: gigs.total,
                gigs
            },
            StatusCodes.OK
        );
    });
    api.post("/create", async (c: Context) => {
        const jsonBody = await c.req.json();
        const currUser = c.get("currentUser");
        const createdGig = await gigHndlr.addGig.bind(gigHndlr)(
            jsonBody,
            currUser
        );

        return c.json(
            {
                message: "Gig created successfully.",
                gig: createdGig
            },
            StatusCodes.CREATED
        );
    });
    api.put("/update/:gigId", async (c: Context) => {
        const gigId = c.req.param("gigId");
        const jsonBody = await c.req.json();
        const gig = await gigHndlr.updateGig.bind(gigHndlr)(gigId, jsonBody);

        return c.json(
            {
                message: "Gig updated successfully.",
                gig
            },
            StatusCodes.OK
        );
    });
    api.put("/status/:gigId", async (c: Context) => {
        const gigId = c.req.param("gigId");
        const { active } = await c.req.json();
        const gig = await gigHndlr.updateActiveStatusGig.bind(gigHndlr)(
            gigId,
            active
        );

        return c.json(
            {
                message: "Gig active status updated successfully.",
                gig
            },
            StatusCodes.OK
        );
    });
    api.delete("/:gigId/:sellerId", async (c: Context) => {
        const { gigId, sellerId } = c.req.param();
        await gigHndlr.removeGig.bind(gigHndlr)(gigId, sellerId);

        return c.json(
            {
                message: "Gig deleted successfully."
            },
            StatusCodes.OK
        );
    });

    api.put("/seed/:count", (c: Context) => {
        const count = c.req.param("count");
        gigHndlr.populateGigs.bind(gigHndlr)(parseInt(count, 10));

        return c.json(
            {
                message: "Seed gigs successfully.",
                total: count
            },
            StatusCodes.CREATED
        );
    });
}

async function verifyGatewayRequest(c: Context, next: Next): Promise<void> {
    const token = c.req.header("gatewayToken");
    if (!token) {
        throw new NotAuthorizedError(
            "Invalid request",
            "verifyGatewayRequest() method: Request not coming from api gateway"
        );
    }

    try {
        const payload: { id: string; iat: number } = jwt.verify(
            token,
            GATEWAY_JWT_TOKEN!
        ) as {
            id: string;
            iat: number;
        };

        c.set("gatewayToken", payload);
        await next();
    } catch (error) {
        throw new NotAuthorizedError(
            "Invalid request",
            "verifyGatewayRequest() method: Request not coming from api gateway"
        );
    }
}
