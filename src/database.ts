import { winstonLogger } from "@Akihira77/jobber-shared";
import { Logger } from "winston";
import { DATABASE_URL, ELASTIC_SEARCH_URL } from "@gig/config";
import mongoose from "mongoose";

const log: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigDatabaseServer",
    "debug"
);

export const databaseConnection = async (): Promise<void> => {
    try {
        // console.log(DATABASE_URL);
        await mongoose.connect(`${DATABASE_URL}`);
        log.info("Gig service successfully connected to database.");
    } catch (error) {
        log.error("GigService databaseConnection() method error:", error);
    }
};
