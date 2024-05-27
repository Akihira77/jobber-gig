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
exports.populateGigs = exports.updateActiveStatusGig = exports.updateGig = exports.getGigsQuerySearch = exports.getGigsMoreLikeThis = exports.getGigsByCategory = exports.getTopRatedGigsByCategory = exports.getSellerInactiveGigs = exports.getSellerActiveGigs = exports.getGigById = exports.removeGig = exports.addGig = void 0;
const jobber_shared_1 = require("@Akihira77/jobber-shared");
const config_1 = require("../config");
const elasticsearch_1 = require("../elasticsearch");
const gig_producer_1 = require("../queues/gig.producer");
const gig_cache_1 = require("../redis/gig.cache");
const gig_schema_1 = require("../schemas/gig.schema");
const server_1 = require("../server");
const gigService = __importStar(require("../services/gig.service"));
const http_status_codes_1 = require("http-status-codes");
const lodash_1 = require("lodash");
function addGig(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = gig_schema_1.gigCreateSchema.validate(req.body);
        if (error === null || error === void 0 ? void 0 : error.details) {
            throw new jobber_shared_1.BadRequestError(error.details[0].message, "Create gig() method");
        }
        const result = (yield (0, jobber_shared_1.uploads)(req.body.coverImage));
        if (!(result === null || result === void 0 ? void 0 : result.public_id)) {
            throw new jobber_shared_1.BadRequestError("File upload error. Try again.", "Create gig() method");
        }
        const documentCount = yield (0, elasticsearch_1.getDocumentCount)("gigs");
        const gigData = {
            sellerId: req.body.sellerId,
            username: req.currentUser.username,
            email: req.currentUser.email,
            profilePicture: req.body.profilePicture,
            title: req.body.title,
            description: req.body.description,
            categories: req.body.categories,
            subCategories: req.body.subCategories,
            tags: req.body.tags,
            price: req.body.price,
            expectedDelivery: req.body.expectedDelivery,
            basicTitle: req.body.basicTitle,
            basicDescription: req.body.basicDescription,
            coverImage: `${result === null || result === void 0 ? void 0 : result.secure_url}`,
            sortId: documentCount + 1
        };
        const createdGig = yield gigService.createGig(gigData);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            message: "Gig created successfully.",
            gig: createdGig
        });
    });
}
exports.addGig = addGig;
function removeGig(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        yield gigService.deleteGig(req.params.gigId, req.params.sellerId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Gig deleted successfully."
        });
    });
}
exports.removeGig = removeGig;
function getGigById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const gig = yield gigService.getGigById(req.params.gigId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Get gig by id",
            gig
        });
    });
}
exports.getGigById = getGigById;
function getSellerActiveGigs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const gigs = yield gigService.getSellerActiveGigs(req.params.sellerId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Seller active gigs",
            gigs
        });
    });
}
exports.getSellerActiveGigs = getSellerActiveGigs;
function getSellerInactiveGigs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const gigs = yield gigService.getSellerInactiveGigs(req.params.sellerId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Seller inactive gigs",
            gigs
        });
    });
}
exports.getSellerInactiveGigs = getSellerInactiveGigs;
function getTopRatedGigsByCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const category = yield (0, gig_cache_1.getUserSelectedGigCategory)(`selectedCategories:${req.params.username}`);
        const resultHits = [];
        const gigs = yield gigService.getTopRatedGigsByCategory(`${category}`);
        for (const item of gigs.hits) {
            resultHits.push(item._source);
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Search top gigs results",
            total: gigs.total,
            gigs: resultHits
        });
    });
}
exports.getTopRatedGigsByCategory = getTopRatedGigsByCategory;
function getGigsByCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const category = yield (0, gig_cache_1.getUserSelectedGigCategory)(`selectedCategories:${req.params.username}`);
        const resultHits = [];
        const gigs = yield gigService.gigsSearchByCategory(`${category}`);
        for (const item of gigs.hits) {
            resultHits.push(item._source);
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Search gigs category results",
            total: gigs.total,
            gigs: resultHits
        });
    });
}
exports.getGigsByCategory = getGigsByCategory;
function getGigsMoreLikeThis(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultHits = [];
        const gigs = yield gigService.getMoreGigsLikeThis(req.params.gigId);
        for (const item of gigs.hits) {
            resultHits.push(item._source);
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Search gigs more like this results",
            total: gigs.total,
            gigs: resultHits
        });
    });
}
exports.getGigsMoreLikeThis = getGigsMoreLikeThis;
function getGigsQuerySearch(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { from, size, type } = req.params;
        let resultHits = [];
        const paginate = {
            from,
            size: parseInt(`${size}`),
            type
        };
        const { query, delivery_time, minprice, minPrice, maxprice, maxPrice, min, max } = req.query;
        const MIN_PRICE = String(minprice || minPrice || min);
        const MAX_PRICE = String(maxprice || maxPrice || max);
        const gigs = yield gigService.gigsSearch(String(query), paginate, parseInt(MIN_PRICE, 10), parseInt(MAX_PRICE, 10), String(delivery_time));
        for (const item of gigs.hits) {
            resultHits.push(item._source);
        }
        if (type === "backward") {
            resultHits = (0, lodash_1.sortBy)(resultHits, ["sortId"]);
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Search gigs results",
            total: gigs.total,
            gigs: resultHits
        });
    });
}
exports.getGigsQuerySearch = getGigsQuerySearch;
function updateGig(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = gig_schema_1.gigUpdateSchema.validate(req.body);
        if (error === null || error === void 0 ? void 0 : error.details) {
            throw new jobber_shared_1.BadRequestError(error.details[0].message, "Update gig() method");
        }
        // check if base64
        // if yes then user uploading a new image
        // if no then image is not changing
        const isNewImage = (0, jobber_shared_1.isDataURL)(req.body.coverImage);
        let coverImage = req.body.coverImage;
        if (isNewImage) {
            const result = (yield (0, jobber_shared_1.uploads)(req.body.coverImage));
            if (!(result === null || result === void 0 ? void 0 : result.public_id)) {
                throw new jobber_shared_1.BadRequestError("File upload error. Try again.", "Update gig() method");
            }
            coverImage = result === null || result === void 0 ? void 0 : result.secure_url;
        }
        const gigData = {
            title: req.body.title,
            description: req.body.description,
            categories: req.body.categories,
            subCategories: req.body.subCategories,
            tags: req.body.tags,
            price: req.body.price,
            expectedDelivery: req.body.expectedDelivery,
            basicTitle: req.body.basicTitle,
            basicDescription: req.body.basicDescription,
            coverImage
        };
        const updatedGig = yield gigService.updateGig(req.params.gigId, gigData);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Gig updated successfully.",
            gig: updatedGig
        });
    });
}
exports.updateGig = updateGig;
function updateActiveStatusGig(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const updatedGig = yield gigService.updateActiveGigProp(req.params.gigId, req.body.active);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            message: "Gig active status updated successfully.",
            gig: updatedGig
        });
    });
}
exports.updateActiveStatusGig = updateActiveStatusGig;
function populateGigs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const count = req.params.count;
        const { gigService } = config_1.exchangeNamesAndRoutingKeys;
        yield (0, gig_producer_1.publishDirectMessage)(server_1.gigChannel, gigService.getSellers.exchangeName, gigService.getSellers.routingKey, JSON.stringify({ type: "getSellers", count }), "Gig seed message sent to users service.");
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            message: "Seed gigs successfully.",
            total: count
        });
    });
}
exports.populateGigs = populateGigs;
//# sourceMappingURL=gig.controller.js.map