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
exports.redisConnect = exports.redisClient = void 0;
const config_1 = require("../config");
const redis_1 = require("redis");
exports.redisClient = (0, redis_1.createClient)({ url: `${config_1.REDIS_HOST}` });
function redisConnect() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.redisClient.connect();
            if (exports.redisClient.isReady) {
                (0, config_1.logger)("redis/redis.connection() - redisConnect()").info(`GigService Redis Connected: ${exports.redisClient.isReady}`);
            }
            catchError();
        }
        catch (error) {
            (0, config_1.logger)("redis/redis.connection() - redisConnect()").error("GigService redisConnect() method error:", error);
        }
    });
}
exports.redisConnect = redisConnect;
function catchError() {
    exports.redisClient.on("error", (error) => {
        (0, config_1.logger)("redis/redis.connection() - redisConnect()").error(error);
    });
}
//# sourceMappingURL=redis.connection.js.map