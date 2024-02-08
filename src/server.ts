import http from "http";
import "express-async-errors";

import compression from "compression";
import jwt from "jsonwebtoken";
import {
    CustomError,
    IAuthPayload,
    IErrorResponse,
    winstonLogger
} from "@Akihira77/jobber-shared";
import { Logger } from "winston";
import { API_GATEWAY_URL, ELASTIC_SEARCH_URL, JWT_TOKEN } from "@gig/config";
import {
    Application,
    NextFunction,
    Request,
    Response,
    json,
    urlencoded
} from "express";
import hpp from "hpp";
import helmet from "helmet";
import cors from "cors";
import { checkConnection, createIndex } from "@gig/elasticsearch";
import { appRoutes } from "@gig/routes";
import { createConnection } from "@gig/queues/connection";
import { Channel } from "amqplib";
import {
    consumeGigDirectMessages,
    consumeSeedDirectMessages
} from "@gig/queues/gig.consumer";

const PORT = 4004;
export let gigChannel: Channel;

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigServer",
    "debug"
);

export function start(app: Application): void {
    securityMiddleware(app);
    standardMiddleware(app);
    routesMiddleware(app);
    startQueues();
    startElasticSearch();
    gigErrorHandler(app);
    startServer(app);
}

function securityMiddleware(app: Application): void {
    app.set("trust proxy", 1);
    app.use(hpp());
    app.use(helmet());
    app.use(
        cors({
            origin: [`${API_GATEWAY_URL}`],
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        })
    );

    app.use((req: Request, _res: Response, next: NextFunction) => {
        // console.log(req.headers);
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(" ")[1];
            const payload = jwt.verify(token, JWT_TOKEN!) as IAuthPayload;

            req.currentUser = payload;
        }
        next();
    });
}

function standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({ limit: "200mb" }));
    app.use(urlencoded({ extended: true, limit: "200mb" }));
}

function routesMiddleware(app: Application): void {
    appRoutes(app);
}

async function startQueues(): Promise<void> {
    gigChannel = (await createConnection()) as Channel;
    await consumeGigDirectMessages(gigChannel);
    await consumeSeedDirectMessages(gigChannel);
}

function startElasticSearch(): void {
    checkConnection();
    createIndex("gigs");
}

function gigErrorHandler(app: Application): void {
    app.use(
        (
            error: IErrorResponse,
            _req: Request,
            res: Response,
            next: NextFunction
        ) => {
            log.error(`GigService ${error.comingFrom}:`, error);

            if (error instanceof CustomError) {
                res.status(error.statusCode).json(error.serializeErrors());
            }
            next();
        }
    );
}

function startServer(app: Application): void {
    try {
        const httpServer: http.Server = new http.Server(app);
        log.info(`Gig server has started with pid ${process.pid}`);
        httpServer.listen(PORT, () => {
            log.info(`Gig server running on port ${PORT}`);
        });
    } catch (error) {
        log.error("GigService startServer() method error:", error);
    }
}
