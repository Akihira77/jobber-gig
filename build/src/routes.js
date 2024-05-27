"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRoutes = void 0;
const gig_route_1 = require("./routes/gig.route");
const health_route_1 = require("./routes/health.route");
const BASE_PATH = "/api/v1/gig";
function appRoutes(app) {
    app.use("", (0, health_route_1.healthRoutes)());
    // app.use(BASE_PATH, verifyGatewayRequest, gigRoutes());
    app.use(BASE_PATH, (0, gig_route_1.gigRoutes)());
}
exports.appRoutes = appRoutes;
//# sourceMappingURL=routes.js.map