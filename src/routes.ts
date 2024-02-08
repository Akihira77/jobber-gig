import { verifyGatewayRequest } from "@Akihira77/jobber-shared";
import { Application } from "express";
import { gigRoutes } from "@gig/routes/gig.route";
import { healthRoutes } from "@gig/routes/health.route";

const BASE_PATH = "/api/v1/gig";

export function appRoutes(app: Application): void {
    app.use("", healthRoutes());
    app.use(BASE_PATH, verifyGatewayRequest, gigRoutes());
}
