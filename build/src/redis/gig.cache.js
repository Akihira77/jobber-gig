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
exports.getUserSelectedGigCategory = void 0;
const config_1 = require("../config");
const redis_connection_1 = require("../redis/redis.connection");
function getUserSelectedGigCategory(key) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!redis_connection_1.redisClient.isOpen) {
                yield (0, redis_connection_1.redisConnect)();
            }
            const response = (_a = (yield redis_connection_1.redisClient.GET(key))) !== null && _a !== void 0 ? _a : "";
            return response;
        }
        catch (error) {
            (0, config_1.logger)("redis/gig.cache.ts - getUserSelectedGigCategory()").error("GigService GigCache getUserSelectedGigCategory() method error:", error.message);
            return "";
        }
    });
}
exports.getUserSelectedGigCategory = getUserSelectedGigCategory;
//# sourceMappingURL=gig.cache.js.map