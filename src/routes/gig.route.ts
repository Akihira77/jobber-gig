import express, { Router } from "express";
import * as gigController from "@gig/controllers/gig.controller";

const router = express.Router();

export function gigRoutes(): Router {
    router.get("/:gigId", gigController.getGigById);
    router.get("/seller/:sellerId", gigController.getSellerActiveGigs);
    router.get(
        "/seller/inactive/:sellerId",
        gigController.getSellerInactiveGigs
    );
    router.get("/search/:from/:size/:type", gigController.getGigsQuerySearch);
    router.get("/category/:username", gigController.getGigsByCategory);
    router.get("/top/:username", gigController.getTopRatedGigsByCategory);
    router.get("/similar/:gigId", gigController.getGigsMoreLikeThis);
    router.post("/create", gigController.addGig);
    router.put("/update/:gigId", gigController.updateGig);
    router.put("/status/:gigId", gigController.updateActiveStatusGig);
    router.delete("/:gigId/:sellerId", gigController.removeGig);

    router.put("/seed/:count", gigController.populateGigs);

    return router;
}
