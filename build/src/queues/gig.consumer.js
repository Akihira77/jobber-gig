"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeSeedDirectMessages = exports.consumeGigDirectMessages = void 0;
const config_1 = require("../config");
const connection_1 = require("../queues/connection");
const gig_service_1 = require("../services/gig.service");
function consumeGigDirectMessages(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!channel) {
                channel = (yield (0, connection_1.createConnection)());
            }
            const { gigService } = config_1.exchangeNamesAndRoutingKeys;
            const queueName = "gig-update-queue";
            yield channel.assertExchange(gigService.updateGig.exchangeName, "direct");
            const jobberQueue = yield channel.assertQueue(queueName, {
                durable: true,
                autoDelete: false
            });
            yield channel.bindQueue(jobberQueue.queue, gigService.updateGig.exchangeName, gigService.updateGig.routingKey);
            yield channel.consume(jobberQueue.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { type, gigReview } = JSON.parse(msg.content.toString());
                    if (type === "updateGigReview") {
                        yield (0, gig_service_1.updateGigReview)(gigReview);
                        channel.ack(msg);
                        return;
                    }
                    channel.reject(msg, false);
                }
                catch (error) {
                    channel.reject(msg, false);
                    (0, config_1.logger)("queues/gig.consumer.ts - consumeGigDirectMessages()").error("consuming message got errors. consumeSeedDirectMessages()", error);
                }
            }));
        }
        catch (error) {
            (0, config_1.logger)("queues/gig.consumer.ts - consumeGigDirectMessages()").error("GigService consumeGigDirectMessages() method error:", error);
        }
    });
}
exports.consumeGigDirectMessages = consumeGigDirectMessages;
function consumeSeedDirectMessages(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!channel) {
                channel = (yield (0, connection_1.createConnection)());
            }
            const { gigService } = config_1.exchangeNamesAndRoutingKeys;
            const queueName = "seed-gig-queue";
            yield channel.assertExchange(gigService.seed.exchangeName, "direct");
            const jobberQueue = yield channel.assertQueue(queueName, {
                durable: true,
                autoDelete: false
            });
            yield channel.bindQueue(jobberQueue.queue, gigService.seed.exchangeName, gigService.seed.routingKey);
            yield channel.consume(jobberQueue.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { sellers, count } = JSON.parse(msg.content.toString());
                    yield (0, gig_service_1.seedData)(sellers, count);
                    channel.ack(msg);
                }
                catch (error) {
                    channel.reject(msg, false);
                    (0, config_1.logger)("queues/gig.consumer.ts - consumeSeedDirectMessages()").error("consuming message go errors. consumeSeedDirectMessages()", error);
                }
            }));
        }
        catch (error) {
            (0, config_1.logger)("queues/gig.consumer.ts - consumeSeedDirectMessages()").error("GigService consumeSeedDirectMessages() method error:", error);
        }
    });
}
exports.consumeSeedDirectMessages = consumeSeedDirectMessages;
//# sourceMappingURL=gig.consumer.js.map