import jwt from "jsonwebtoken";
import {
    CustomError,
    IAuthPayload,
    NotAuthorizedError
} from "@Akihira77/jobber-shared";
import { API_GATEWAY_URL, JWT_TOKEN, PORT } from "@gig/config";
import { ElasticSearchClient } from "@gig/elasticsearch";
import { appRoutes } from "@gig/routes";
import { Channel } from "amqplib";
import { Logger } from "winston";
import { Context, Hono, Next } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { timeout } from "hono/timeout";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { rateLimiter } from "hono-rate-limiter";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { StatusCode } from "hono/utils/http-status";
import { serve } from "@hono/node-server";

import { GigQueue } from "./queues/gig.queue";

export let gigChannel: Channel;
const LIMIT_TIMEOUT = 2 * 1000; // 2s

export async function start(
    app: Hono,
    logger: (moduleName: string) => Logger
): Promise<void> {
    const queue = await startQueues(logger);
    const elastic = await startElasticSearch(logger);
    gigErrorHandler(app);
    securityMiddleware(app);
    standardMiddleware(app);
    routesMiddleware(app, queue, elastic, logger);
    startServer(app, logger);
}

function securityMiddleware(app: Hono): void {
    app.use(
        timeout(LIMIT_TIMEOUT, () => {
            return new HTTPException(StatusCodes.REQUEST_TIMEOUT, {
                message: `Request timeout after waiting ${LIMIT_TIMEOUT}ms. Please try again later.`
            });
        })
    );
    app.use(secureHeaders());
    app.use(csrf());
    app.use(
        cors({
            origin: [`${API_GATEWAY_URL}`],
            credentials: true,
            allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        })
    );

    app.use(async (c: Context, next: Next) => {
        if (c.req.path == "/gig-health") {
            await next();
            return;
        }

        const authorization = c.req.header("authorization");
        if (!authorization || authorization === "") {
            throw new NotAuthorizedError(
                "unauthenticated request",
                "Gig Service"
            );
        }

        const token = authorization.split(" ")[1];
        const payload = jwt.verify(token, JWT_TOKEN!) as IAuthPayload;

        c.set("currentUser", payload);
        await next();
    });
}

function standardMiddleware(app: Hono): void {
    app.use(compress());
    app.use(
        bodyLimit({
            maxSize: 2 * 100 * 1000 * 1024, //200mb
            onError(c: Context) {
                return c.text(
                    "Your request is too big",
                    StatusCodes.REQUEST_HEADER_FIELDS_TOO_LARGE
                );
            }
        })
    );

    const generateRandomNumber = (length: number): number => {
        return (
            Math.floor(Math.random() * (9 * Math.pow(10, length - 1))) +
            Math.pow(10, length - 1)
        );
    };

    app.use(
        rateLimiter({
            windowMs: 1 * 60 * 1000, //60s
            limit: 10,
            standardHeaders: "draft-6",
            keyGenerator: () => generateRandomNumber(12).toString()
        })
    );
}

function routesMiddleware(
    app: Hono,
    queue: GigQueue,
    elastic: ElasticSearchClient,
    logger: (moduleName: string) => Logger
): void {
    appRoutes(app, queue, elastic, logger);
}

async function startQueues(
    logger: (moduleName: string) => Logger
): Promise<GigQueue> {
    const queue = new GigQueue(null, logger);
    await queue.createConnection();
    queue.consumeGigDirectMessages();
    queue.consumeSeedDirectMessages();

    return queue;
}

export async function startElasticSearch(
    logger: (moduleName: string) => Logger
): Promise<ElasticSearchClient> {
    const elastic = new ElasticSearchClient(logger);
    await elastic.checkConnection();
    elastic.createIndex("gigs");

    return elastic;
}

function gigErrorHandler(app: Hono): void {
    app.notFound((c) => {
        return c.text("Route path is not found", StatusCodes.NOT_FOUND);
    });

    app.onError((err: Error, c: Context) => {
        if (err instanceof CustomError) {
            return c.json(
                err.serializeErrors(),
                (err.statusCode as StatusCode) ??
                    StatusCodes.INTERNAL_SERVER_ERROR
            );
        } else if (err instanceof HTTPException) {
            return err.getResponse();
        }

        return c.text(
            "Unexpected error occured. Please try again",
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    });
}

function startServer(app: Hono, logger: (moduleName: string) => Logger): void {
    try {
        logger("server.ts - startServer()").info(
            `GigService has started with pid ${process.pid}`
        );

        serve({ fetch: app.fetch, port: Number(PORT) }, (info) => {
            logger("server.ts - startServer()").info(
                `GigService running on port ${info.port}`
            );
        });
    } catch (error) {
        logger("server.ts - startServer()").error(
            "GigService startServer() method error:",
            error
        );
    }
}
