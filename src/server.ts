import { createVerifier } from "fast-jwt"
import {
    CustomError,
    IAuthPayload,
    winstonLogger
} from "@Akihira77/jobber-shared"
import {
    API_GATEWAY_URL,
    ELASTIC_SEARCH_URL,
    JWT_TOKEN,
    NODE_ENV,
    PORT
} from "@gig/config"
import { Context, Hono, Next } from "hono"
import { cors } from "hono/cors"
import { compress } from "hono/compress"
import { timeout } from "hono/timeout"
import { csrf } from "hono/csrf"
import { secureHeaders } from "hono/secure-headers"
import { bodyLimit } from "hono/body-limit"
import { rateLimiter } from "hono-rate-limiter"
import { HTTPException } from "hono/http-exception"
import { appRoutes } from "@gig/routes"
import { Logger } from "winston"
import { StatusCodes } from "http-status-codes"
import { StatusCode } from "hono/utils/http-status"
import { serve } from "@hono/node-server"
import { logger } from "hono/logger"
import { GigQueue } from "./queues/gig.queue"
import { ElasticSearchClient } from "./elasticsearch"

const LIMIT_TIMEOUT = 3 * 1000 // 3s

export async function setupHono(
    app: Hono,
    logger?: (location?: string) => Logger
): Promise<Hono> {
    if (!logger) {
        logger = (location?: string) =>
            winstonLogger(
                `${ELASTIC_SEARCH_URL}`,
                location ?? "server.ts",
                "debug"
            )
    }
    const elastic = await startElasticSearch(logger)
    const queue = await startQueues(elastic, logger)
    gigErrorHandler(app)
    securityMiddleware(app)
    standardMiddleware(app)
    routesMiddleware(app, queue, elastic, logger)

    return app
}

export async function start(
    app: Hono,
    logger: (moduleName?: string) => Logger
): Promise<void> {
    app = await setupHono(app, logger)
    startServer(app, logger)
}

function securityMiddleware(app: Hono): void {
    app.use(
        timeout(LIMIT_TIMEOUT, () => {
            return new HTTPException(StatusCodes.REQUEST_TIMEOUT, {
                message: `Request timeout after waiting ${LIMIT_TIMEOUT}ms. Please try again later.`
            })
        })
    )
    app.use(
        secureHeaders({
            xXssProtection: "1"
        })
    )
    app.use(csrf({ origin: [`${API_GATEWAY_URL}`] }))
    app.use(
        cors({
            origin: [`${API_GATEWAY_URL}`],
            credentials: true,
            allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        })
    )

    app.use(async (c: Context, next: Next) => {
        const authorization = c.req.header("authorization")
        if (authorization && authorization !== "") {
            const authBearer = authorization.split(" ")[1]
            const verifier = createVerifier({
                key: `${JWT_TOKEN}`,
                cache: true,
                cacheTTL: 30 * 60 * 1000
            })
            const payload = verifier(authBearer) as IAuthPayload
            c.set("currentUser", payload)
        }

        await next()
    })
}

function standardMiddleware(app: Hono): void {
    if (NODE_ENV !== "production") {
        app.use(logger())
    }
    app.use(compress())
    app.use(
        bodyLimit({
            maxSize: 2 * 100 * 1000 * 1024, //200mb
            onError(c: Context) {
                return c.text(
                    "Your request is too big",
                    StatusCodes.REQUEST_HEADER_FIELDS_TOO_LARGE
                )
            }
        })
    )

    const generateRandomNumber = (length: number): number => {
        return (
            Math.floor(Math.random() * (9 * Math.pow(10, length - 1))) +
            Math.pow(10, length - 1)
        )
    }

    app.use(
        rateLimiter({
            windowMs: 1 * 60 * 1000, //60s
            limit: 10,
            standardHeaders: "draft-6",
            keyGenerator: () => generateRandomNumber(12).toString()
        })
    )
}

function routesMiddleware(
    app: Hono,
    queue: GigQueue,
    elastic: ElasticSearchClient,
    logger: (moduleName: string) => Logger
): void {
    appRoutes(app, queue, elastic, logger)
}

async function startQueues(
    elastic: ElasticSearchClient,
    logger: (moduleName?: string) => Logger
): Promise<GigQueue> {
    const queue = new GigQueue(null, elastic, logger)
    await queue.createConnection()
    queue.consumeGigDirectMessages()
    queue.consumeSeedDirectMessages()
    return queue
}

export async function startElasticSearch(
    logger: (moduleName: string) => Logger
): Promise<ElasticSearchClient> {
    const elastic = new ElasticSearchClient(logger)
    await elastic.checkConnection()
    elastic.createIndex("gigs")

    return elastic
}

function gigErrorHandler(app: Hono): void {
    app.notFound((c) => {
        return c.text("Route path does not found", StatusCodes.NOT_FOUND)
    })

    app.onError((err: Error, c: Context) => {
        if (err instanceof CustomError) {
            console.log(err)
            return c.json(
                err.serializeErrors(),
                (err.statusCode as StatusCode) ??
                    StatusCodes.INTERNAL_SERVER_ERROR
            )
        } else if (err instanceof HTTPException) {
            return err.getResponse()
        }

        return c.text(
            "Unexpected error occured. Please try again",
            StatusCodes.INTERNAL_SERVER_ERROR
        )
    })
}

function startServer(hono: Hono, logger: (moduleName: string) => Logger): void {
    try {
        logger("server.ts - startServer()").info(
            `GigService has started with pid ${process.pid}`
        )
        serve({ fetch: hono.fetch, port: Number(PORT) }, (info) => {
            logger("server.ts - startServer()").info(
                `GigService running on port ${info.port}`
            )
        })
    } catch (error) {
        logger("server.ts - startServer()").error(
            "GigService startServer() method error:",
            error
        )
    }
}
