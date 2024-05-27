"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gigRoutes = void 0;
const express_1 = __importDefault(require("express"));
const gigController = __importStar(require("../controllers/gig.controller"));
const router = express_1.default.Router();
function gigRoutes() {
    router.get("/:gigId", gigController.getGigById);
    router.get("/seller/:sellerId", gigController.getSellerActiveGigs);
    router.get("/seller/inactive/:sellerId", gigController.getSellerInactiveGigs);
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
exports.gigRoutes = gigRoutes;
//# sourceMappingURL=gig.route.js.map