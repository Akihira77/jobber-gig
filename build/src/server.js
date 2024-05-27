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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startElasticSearch = exports.start = exports.gigChannel = void 0;
const http_1 = __importDefault(require("http"));
require("express-async-errors");
const compression_1 = __importDefault(require("compression"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jobber_shared_1 = require("@Akihira77/jobber-shared");
const config_1 = require("./config");
const express_1 = require("express");
const hpp_1 = __importDefault(require("hpp"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const elasticsearch_1 = require("./elasticsearch");
const routes_1 = require("./routes");
const connection_1 = require("./queues/connection");
const gig_consumer_1 = require("./queues/gig.consumer");
const morgan_1 = __importDefault(require("morgan"));
function start(app) {
    securityMiddleware(app);
    standardMiddleware(app);
    routesMiddleware(app);
    startQueues();
    startElasticSearch();
    gigErrorHandler(app);
    startServer(app);
}
exports.start = start;
function securityMiddleware(app) {
    app.set("trust proxy", 1);
    app.use((0, hpp_1.default)());
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: [`${config_1.API_GATEWAY_URL}`],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }));
    app.use((req, _res, next) => {
        // console.logger(req.headers);
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(" ")[1];
            const payload = jsonwebtoken_1.default.verify(token, config_1.JWT_TOKEN);
            req.currentUser = payload;
        }
        next();
    });
}
function standardMiddleware(app) {
    app.use((0, compression_1.default)());
    app.use((0, express_1.json)({ limit: "200mb" }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: "200mb" }));
    app.use((0, morgan_1.default)("dev"));
}
function routesMiddleware(app) {
    (0, routes_1.appRoutes)(app);
}
function startQueues() {
    return __awaiter(this, void 0, void 0, function* () {
        exports.gigChannel = (yield (0, connection_1.createConnection)());
        yield (0, gig_consumer_1.consumeGigDirectMessages)(exports.gigChannel);
        yield (0, gig_consumer_1.consumeSeedDirectMessages)(exports.gigChannel);
    });
}
function startElasticSearch() {
    (0, elasticsearch_1.checkConnection)();
    (0, elasticsearch_1.createIndex)("gigs");
}
exports.startElasticSearch = startElasticSearch;
function gigErrorHandler(app) {
    app.use((error, _req, res, next) => {
        (0, config_1.logger)("server.ts - gigErrorHandler()").error(`GigService ${error.comingFrom}:`, error);
        if (error instanceof jobber_shared_1.CustomError) {
            res.status(error.statusCode).json(error.serializeErrors());
        }
        next();
    });
}
function startServer(app) {
    try {
        const httpServer = new http_1.default.Server(app);
        (0, config_1.logger)("server.ts - startServer()").info(`GigService has started with pid ${process.pid}`);
        httpServer.listen(Number(config_1.PORT), () => {
            (0, config_1.logger)("server.ts - startServer()").info(`GigService running on port ${config_1.PORT}`);
        });
    }
    catch (error) {
        (0, config_1.logger)("server.ts - startServer()").error("GigService startServer() method error:", error);
    }
}
//# sourceMappingURL=server.js.map