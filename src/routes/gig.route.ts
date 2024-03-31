import express, { Router } from "express";
import * as create from "@gig/controllers/create";
import * as update from "@gig/controllers/update";
import * as remove from "@gig/controllers/delete";
import * as get from "@gig/controllers/get";
import * as search from "@gig/controllers/search";
import * as seed from "@gig/controllers/seed";

const router = express.Router();

export function gigRoutes(): Router {
    router.get("/:gigId", get.gigById);
    router.get("/seller/:sellerId", get.sellerActiveGigs);
    router.get("/seller/inactive/:sellerId", get.sellerInactiveGigs);
    router.get("/search/:from/:size/:type", search.gigsQuerySearch);
    router.get("/category/:username", get.gigsByCategory);
    router.get("/top/:username", get.topRatedGigsByCategory);
    router.get("/similar/:gigId", get.gigsMoreLikeThis);

    router.post("/create", create.gig);

    router.put("/seed/:count", seed.gigs);
    router.put("/update/:gigId", update.gig);
    router.put("/status/:gigId", update.gigUpdateActiveStatus);

    router.delete("/:gigId/:sellerId", remove.gig);

    return router;
}
