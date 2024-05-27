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
exports.seedData = exports.getTopRatedGigsByCategory = exports.getMoreGigsLikeThis = exports.gigsSearchByCategory = exports.gigsSearch = exports.findGigsSearchBySellerId = exports.updateGigReview = exports.updateActiveGigProp = exports.updateGig = exports.deleteGig = exports.createGig = exports.getSellerInactiveGigs = exports.getSellerActiveGigs = exports.getGigById = void 0;
const jobber_shared_1 = require("@Akihira77/jobber-shared");
const faker_1 = require("@faker-js/faker");
const config_1 = require("../config");
const elasticsearch_1 = require("../elasticsearch");
const gig_model_1 = require("../models/gig.model");
const gig_producer_1 = require("../queues/gig.producer");
const server_1 = require("../server");
const lodash_1 = require("lodash");
const cloudinary_1 = __importDefault(require("cloudinary"));
const mongoose_1 = require("mongoose");
const logger = (0, jobber_shared_1.winstonLogger)(`${config_1.ELASTIC_SEARCH_URL}`, "gigService", "debug");
function getGigById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const gig = yield (0, elasticsearch_1.getIndexedData)("gigs", id);
        return gig;
    });
}
exports.getGigById = getGigById;
function getSellerActiveGigs(sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const results = [];
            const gigs = yield gig_model_1.GigModel.find({
                sellerId,
                active: true
            }).exec();
            gigs.forEach((gig) => {
                var _a;
                const gigOmit_Id = (_a = gig.toJSON) === null || _a === void 0 ? void 0 : _a.call(gig);
                results.push(gigOmit_Id);
            });
            return results;
        }
        catch (error) {
            logger.error("GigService getSellerActiveGigs() method error", error);
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.getSellerActiveGigs = getSellerActiveGigs;
function getSellerInactiveGigs(sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const results = [];
            const gigs = yield gig_model_1.GigModel.find({
                sellerId,
                active: false
            }).exec();
            gigs.forEach((gig) => {
                var _a;
                const gigOmit_Id = (_a = gig.toJSON) === null || _a === void 0 ? void 0 : _a.call(gig);
                results.push(gigOmit_Id);
            });
            return results;
        }
        catch (error) {
            logger.error("GigService getSellerInactiveGigs() method error", error);
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.getSellerInactiveGigs = getSellerInactiveGigs;
function createGig(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { expectedDelivery } = request;
            if (!(expectedDelivery.includes("Day Delivery") ||
                expectedDelivery.includes("Days Delivery"))) {
                throw new jobber_shared_1.BadRequestError("Error expected delivery field is incorrect value", "GigService createGig() method");
            }
            const createdGig = yield gig_model_1.GigModel.create(request);
            if (createdGig) {
                const gigOmit_Id = (_a = createdGig.toJSON) === null || _a === void 0 ? void 0 : _a.call(createdGig);
                const { usersService } = config_1.exchangeNamesAndRoutingKeys;
                yield (0, gig_producer_1.publishDirectMessage)(server_1.gigChannel, usersService.seller.exchangeName, usersService.seller.routingKey, JSON.stringify({
                    type: "update-gig-count",
                    sellerId: gigOmit_Id.sellerId,
                    count: 1
                }), "Details sent to users service");
                yield (0, elasticsearch_1.addDataToIndex)("gigs", createdGig._id.toString(), gigOmit_Id);
            }
            return createdGig;
        }
        catch (error) {
            logger.error("GigService createGig() method error", error);
            if (error instanceof jobber_shared_1.CustomError) {
                throw error;
            }
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.createGig = createGig;
function deleteGig(gigId, sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(0, mongoose_1.isValidObjectId)(gigId)) {
                throw new jobber_shared_1.BadRequestError("Invalid gig id", "GigService deleteGig() method");
            }
            const result = yield gig_model_1.GigModel.findOneAndDelete({ _id: gigId, sellerId })
                .lean()
                .exec();
            if (!result) {
                throw new jobber_shared_1.NotFoundError("Gig is not found", "GigService deleteGig() method");
            }
            if (result.coverImage.includes("res.cloudinary.com")) {
                const textPerPath = result.coverImage.split("/");
                const fileName = textPerPath[textPerPath.length - 1];
                const public_id = fileName.slice(0, fileName.indexOf("."));
                cloudinary_1.default.v2.uploader.destroy(public_id, {
                    resource_type: "image"
                });
            }
            const { usersService } = config_1.exchangeNamesAndRoutingKeys;
            yield (0, gig_producer_1.publishDirectMessage)(server_1.gigChannel, usersService.seller.exchangeName, usersService.seller.routingKey, JSON.stringify({
                type: "update-gig-count",
                gigSellerId: sellerId,
                count: -1
            }), "Details sent to users service");
            yield (0, elasticsearch_1.deleteIndexedData)("gigs", gigId);
        }
        catch (error) {
            logger.error("GigService deleteGig() method error", error);
            if (error instanceof jobber_shared_1.CustomError) {
                throw error;
            }
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.deleteGig = deleteGig;
function updateGig(gigId, gigData) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(0, mongoose_1.isValidObjectId)(gigId)) {
                throw new jobber_shared_1.BadRequestError("Invalid gig id", "GigService updateGig() method");
            }
            const updatedGig = yield gig_model_1.GigModel.findOneAndUpdate({ _id: gigId, sellerId: gigData.sellerId }, {
                $set: {
                    title: gigData.title,
                    description: gigData.description,
                    categories: gigData.categories,
                    subCategories: gigData.subCategories,
                    tags: gigData.tags,
                    price: gigData.price,
                    coverImage: gigData.coverImage,
                    expectedDelivery: gigData.expectedDelivery,
                    basicTitle: gigData.basicTitle,
                    basicDescription: gigData.basicDescription
                }
            }, {
                new: true
            }).exec();
            if (updatedGig) {
                const gigOmit_Id = (_a = updatedGig.toJSON) === null || _a === void 0 ? void 0 : _a.call(updatedGig);
                yield (0, elasticsearch_1.updateIndexedData)("gigs", updatedGig._id.toString(), gigOmit_Id);
            }
            return updatedGig;
        }
        catch (error) {
            logger.error("GigService updateGig() method error", error);
            if (error instanceof jobber_shared_1.CustomError) {
                throw error;
            }
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.updateGig = updateGig;
function updateActiveGigProp(gigId, active) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(0, mongoose_1.isValidObjectId)(gigId)) {
                throw new jobber_shared_1.BadRequestError("Invalid gig id", "GigService updateActiveGigProp() method");
            }
            const updatedGig = yield gig_model_1.GigModel.findOneAndUpdate({ _id: gigId }, {
                $set: {
                    active
                }
            }, {
                new: true
            }).exec();
            if (updatedGig) {
                const gigOmit_Id = (_a = updatedGig.toJSON) === null || _a === void 0 ? void 0 : _a.call(updatedGig);
                yield (0, elasticsearch_1.updateIndexedData)("gigs", gigOmit_Id.id.toString(), gigOmit_Id);
            }
            return updatedGig;
        }
        catch (error) {
            logger.error("GigService updateActiveGigProp() method error", error);
            if (error instanceof jobber_shared_1.CustomError) {
                throw error;
            }
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.updateActiveGigProp = updateActiveGigProp;
function updateGigReview(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(0, mongoose_1.isValidObjectId)(request.gigId)) {
                throw new jobber_shared_1.BadRequestError("Invalid gig id", "GigService updateGigReview() method");
            }
            const ratingTypes = {
                "1": "one",
                "2": "two",
                "3": "three",
                "4": "four",
                "5": "five"
            };
            const ratingKey = ratingTypes[`${request.rating}`];
            const updatedGig = yield gig_model_1.GigModel.findOneAndUpdate({ _id: request.gigId, sellerId: request.sellerId }, {
                $inc: {
                    ratingsCount: 1, // sum of user rating
                    ratingSum: request.rating, // sum of star
                    [`ratingCategories.${ratingKey}.value`]: request.rating,
                    [`ratingCategories.${ratingKey}.count`]: 1
                }
            }, { new: true, upsert: true }).exec();
            if (updatedGig) {
                const gigOmit_Id = (_a = updatedGig.toJSON) === null || _a === void 0 ? void 0 : _a.call(updatedGig);
                yield (0, elasticsearch_1.updateIndexedData)("gigs", updatedGig._id.toString(), gigOmit_Id);
            }
        }
        catch (error) {
            logger.error("GigService updateGigReview() method error", error);
            if (error instanceof jobber_shared_1.CustomError) {
                throw error;
            }
            throw new Error("Unexpected error occured. Please try again.");
        }
    });
}
exports.updateGigReview = updateGigReview;
function findGigsSearchBySellerId(searchQuery, active) {
    return __awaiter(this, void 0, void 0, function* () {
        // try it on elasticsearch dev tools
        const queryList = [
            {
                query_string: {
                    fields: ["sellerId"],
                    query: `*${searchQuery}*`
                }
            },
            {
                term: {
                    active
                }
            }
        ];
        try {
            const result = yield elasticsearch_1.elasticSearchClient.search({
                index: "gigs",
                query: {
                    bool: {
                        must: queryList
                    }
                }
            });
            const total = result.hits.total;
            const hits = result.hits.hits;
            return { total: total.value, hits };
        }
        catch (error) {
            logger.error("GigService gigsSearchBySellerId() method error:", error);
            return { total: 0, hits: [] };
        }
    });
}
exports.findGigsSearchBySellerId = findGigsSearchBySellerId;
function gigsSearch(searchQuery, paginate, min, max, deliveryTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const { from, size, type } = paginate;
        // try it on elasticsearch dev tools
        const queryList = [
            {
                query_string: {
                    fields: [
                        "username",
                        "title",
                        "description",
                        "basicDescription",
                        "basicTitle",
                        "categories",
                        "subCategories",
                        "tags"
                    ],
                    query: `*${searchQuery}*`
                }
            },
            {
                term: {
                    active: true
                }
            }
        ];
        if (deliveryTime !== "undefined") {
            queryList.push({
                query_string: {
                    fields: ["expectedDelivery"],
                    query: `*${deliveryTime}*`
                }
            });
        }
        if (!isNaN(min) && !isNaN(max)) {
            queryList.push({
                range: {
                    price: {
                        gte: min,
                        lte: max
                    }
                }
            });
        }
        try {
            const result = yield elasticsearch_1.elasticSearchClient.search(Object.assign({ index: "gigs", size, query: {
                    bool: {
                        must: queryList
                    }
                }, sort: [
                    {
                        sortId: type === "forward" ? "asc" : "desc"
                    }
                ] }, (from !== "0" && { search_after: [from] })));
            const total = result.hits.total;
            const hits = result.hits.hits;
            return { total: total.value, hits };
        }
        catch (error) {
            logger.error("GigService gigsSearch() method error:", error);
            return { total: 0, hits: [] };
        }
    });
}
exports.gigsSearch = gigsSearch;
function gigsSearchByCategory(searchQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield elasticsearch_1.elasticSearchClient.search({
                index: "gigs",
                size: 10,
                query: {
                    bool: {
                        must: [
                            {
                                query_string: {
                                    fields: ["categories"],
                                    query: `*${searchQuery}*`
                                }
                            },
                            {
                                term: {
                                    active: true
                                }
                            }
                        ]
                    }
                }
            });
            const total = result.hits.total;
            const hits = result.hits.hits;
            return { total: total.value, hits };
        }
        catch (error) {
            logger.error("GigService gigsSearchByCategory() method error:", error);
            return { total: 0, hits: [] };
        }
    });
}
exports.gigsSearchByCategory = gigsSearchByCategory;
function getMoreGigsLikeThis(gigId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield elasticsearch_1.elasticSearchClient.search({
                index: "gigs",
                size: 5,
                query: {
                    more_like_this: {
                        fields: [
                            "username",
                            "title",
                            "description",
                            "basicDescription",
                            "basicTitle",
                            "categories",
                            "subCategories",
                            "tags"
                        ],
                        like: [
                            {
                                _index: "gigs",
                                _id: gigId
                            }
                        ]
                    }
                }
            });
            const total = result.hits.total;
            const hits = result.hits.hits;
            return { total: total.value, hits };
        }
        catch (error) {
            logger.error("GigService getMoreGigsLikeThis() method error:", error);
            return { total: 0, hits: [] };
        }
    });
}
exports.getMoreGigsLikeThis = getMoreGigsLikeThis;
function getTopRatedGigsByCategory(searchQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield elasticsearch_1.elasticSearchClient.search({
                index: "gigs",
                size: 10,
                query: {
                    bool: {
                        filter: {
                            script: {
                                script: {
                                    source: "doc['ratingSum'].value != 0 && (doc['ratingSum'].value / doc['ratingsCount'].value == params['threshold'])",
                                    lang: "painless",
                                    params: {
                                        threshold: 5
                                    }
                                }
                            }
                        },
                        must: [
                            {
                                query_string: {
                                    fields: ["categories"],
                                    query: `*${searchQuery}*`
                                }
                            }
                        ]
                    }
                }
            });
            const total = result.hits.total;
            const hits = result.hits.hits;
            return { total: total.value, hits };
        }
        catch (error) {
            logger.error("GigService getTopRatedGigsByCategory() method error:", error);
            return { total: 0, hits: [] };
        }
    });
}
exports.getTopRatedGigsByCategory = getTopRatedGigsByCategory;
function seedData(sellers, count) {
    return __awaiter(this, void 0, void 0, function* () {
        const categories = [
            "Graphic & Design",
            "Digital Marketing",
            "Writing & Translation",
            "Video & Animation",
            "Music & Audio",
            "Programming & Tech",
            "Data",
            "Business"
        ];
        const expectedDeliveries = [
            "1 Day Delivery",
            "2 Days Delivery",
            "3 Days Delivery",
            "4 Days Delivery",
            "5 Days Delivery"
        ];
        const randomRatings = [
            { sum: 20, count: 4 },
            { sum: 10, count: 2 },
            { sum: 15, count: 3 },
            { sum: 20, count: 5 },
            { sum: 5, count: 1 }
        ];
        for (let i = 0; i < parseInt(count); i++) {
            const sellerDoc = sellers[Math.floor(Math.random() * (sellers.length - 1))];
            const title = `I will ${faker_1.faker.word.words(5)}`;
            const basicTitle = faker_1.faker.commerce.productName();
            const basicDescription = faker_1.faker.commerce.productDescription();
            const rating = (0, lodash_1.sample)(randomRatings);
            const gig = {
                profilePicture: sellerDoc.profilePicture,
                sellerId: sellerDoc._id,
                email: sellerDoc.email,
                username: sellerDoc.username,
                title: title.length <= 80 ? title : title.slice(0, 80),
                basicTitle: basicTitle.length <= 40 ? basicTitle : basicTitle.slice(0, 40),
                basicDescription: basicDescription.length <= 100
                    ? basicDescription
                    : basicDescription.slice(0, 100),
                categories: `${(0, lodash_1.sample)(categories)}`,
                subCategories: [
                    faker_1.faker.commerce.department(),
                    faker_1.faker.commerce.department(),
                    faker_1.faker.commerce.department()
                ],
                description: faker_1.faker.lorem.sentences({ min: 2, max: 4 }),
                tags: [
                    faker_1.faker.commerce.product(),
                    faker_1.faker.commerce.product(),
                    faker_1.faker.commerce.product(),
                    faker_1.faker.commerce.product()
                ],
                price: parseInt(faker_1.faker.commerce.price({ min: 20, max: 30, dec: 0 })),
                coverImage: faker_1.faker.image.urlPicsumPhotos(),
                expectedDelivery: `${(0, lodash_1.sample)(expectedDeliveries)}`,
                sortId: parseInt(count) + i + 1,
                ratingsCount: (i + 1) % 4 === 0 ? rating.count : 0,
                ratingSum: (i + 1) % 4 === 0 ? rating.sum : 0
            };
            console.log(`***SEEDING GIG*** - ${i + 1} of ${count}`);
            createGig(gig);
        }
    });
}
exports.seedData = seedData;
//# sourceMappingURL=gig.service.js.map