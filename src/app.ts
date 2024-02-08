import { databaseConnection } from "@gig/database";
import { cloudinaryConfig } from "@gig/config";
import express, { Express } from "express";
import { start } from "@gig/server";
import { redisConnect } from "@gig/redis/redis.connection";

const initialize = (): void => {
    cloudinaryConfig();
    databaseConnection();
    const app: Express = express();
    start(app);
    redisConnect();
};

initialize();
