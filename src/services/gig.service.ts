import {
    BadRequestError,
    CustomError,
    IHitsTotal,
    IPaginateProps,
    IQueryList,
    IRatingTypes,
    IReviewMessageDetails,
    ISearchResult,
    ISellerDocument,
    ISellerGig,
    NotFoundError,
    winstonLogger
} from "@Akihira77/jobber-shared";
import { faker } from "@faker-js/faker";
import { ELASTIC_SEARCH_URL, exchangeNamesAndRoutingKeys } from "@gig/config";
import {
    addDataToIndex,
    deleteIndexedData,
    elasticSearchClient,
    getIndexedData,
    updateIndexedData
} from "@gig/elasticsearch";
import { GigModel } from "@gig/models/gig.model";
import { publishDirectMessage } from "@gig/queues/gig.producer";
import { gigChannel } from "@gig/server";
import { sample } from "lodash";
import cloudinary from "cloudinary";
import { Logger } from "winston";
import { isValidObjectId } from "mongoose";
import { SearchResponse } from "@elastic/elasticsearch/lib/api/types";

const logger: Logger = winstonLogger(
    `${ELASTIC_SEARCH_URL}`,
    "gigService",
    "debug"
);

export async function getGigById(id: string): Promise<ISellerGig> {
    const gig = await getIndexedData("gigs", id);

    return gig;
}

export async function getSellerActiveGigs(
    sellerId: string
): Promise<ISellerGig[]> {
    try {
        const results: ISellerGig[] = [];
        const gigs: ISellerGig[] = await GigModel.find({
            sellerId,
            active: true
        })
            .exec();

        gigs.forEach((gig) => {
            const gigOmit_Id = gig.toJSON?.() as ISellerGig;
            results.push(gigOmit_Id);
        });

        return results;
    } catch (error) {
        logger.error("GigService getSellerActiveGigs() method error", error);
        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function getSellerInactiveGigs(
    sellerId: string
): Promise<ISellerGig[]> {
    try {
        const results: ISellerGig[] = [];
        const gigs: ISellerGig[] = await GigModel.find({
            sellerId,
            active: false
        })
            .exec();

        gigs.forEach((gig) => {
            const gigOmit_Id = gig.toJSON?.() as ISellerGig;
            results.push(gigOmit_Id);
        });

        return results;
    } catch (error) {
        logger.error("GigService getSellerInactiveGigs() method error", error);
        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function createGig(request: ISellerGig): Promise<ISellerGig> {
    try {
        const { expectedDelivery } = request;
        if (!(expectedDelivery.includes("Day Delivery") || expectedDelivery.includes("Days Delivery"))
        ) {
            throw new BadRequestError("Error expected delivery field is incorrect value", "GigService createGig() method")
        }

        const createdGig = await GigModel.create(request);

        if (createdGig) {
            const gigOmit_Id = createdGig.toJSON?.() as ISellerGig;
            const { usersService } = exchangeNamesAndRoutingKeys;

            await publishDirectMessage(
                gigChannel,
                usersService.seller.exchangeName,
                usersService.seller.routingKey,
                JSON.stringify({
                    type: "update-gig-count",
                    gigSellerId: `${gigOmit_Id.sellerId}`,
                    count: 1
                }),
                "Details sent to users service"
            );
            await addDataToIndex("gigs", createdGig._id.toString(), gigOmit_Id);
        }

        return createdGig;
    } catch (error) {
        logger.error("GigService createGig() method error", error);
        if (error instanceof CustomError) {
            throw error
        }

        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function deleteGig(
    gigId: string,
    sellerId: string
): Promise<void> {
    try {
        if (!isValidObjectId(gigId)) {
            throw new BadRequestError(
                "Invalid gig id",
                "GigService deleteGig() method"
            );
        }

        const result = await GigModel.findOneAndDelete({ _id: gigId, sellerId })
            .lean()
            .exec();

        if (!result) {
            throw new NotFoundError(
                "Gig is not found",
                "GigService deleteGig() method"
            );
        }

        if (result.coverImage.includes("res.cloudinary.com")) {
            const textPerPath = result.coverImage.split("/");
            const fileName = textPerPath[textPerPath.length - 1];
            const public_id = fileName.slice(0, fileName.indexOf("."));

            cloudinary.v2.uploader.destroy(public_id, {
                resource_type: "image"
            });
        }

        const { usersService } = exchangeNamesAndRoutingKeys;

        await publishDirectMessage(
            gigChannel,
            usersService.seller.exchangeName,
            usersService.seller.routingKey,
            JSON.stringify({
                type: "update-gig-count",
                gigSellerId: sellerId,
                count: -1
            }),
            "Details sent to users service"
        );
        await deleteIndexedData("gigs", gigId);
    } catch (error) {
        logger.error("GigService deleteGig() method error", error);

        if (error instanceof CustomError) {
            throw error
        }

        throw new Error("Unexpected error occured. Please try again.");
    }
}

export async function updateGig(
    gigId: string,
    gigData: ISellerGig
): Promise<ISellerGig | null> {
    try {
        if (!isValidObjectId(gigId)) {
            throw new BadRequestError("Invalid gig id", "GigService updateGig() method")
        }

        const updatedGig = (await GigModel.findOneAndUpdate(
            { _id: gigId, sellerId: gigData.sellerId },
            {
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
            },
            {
                new: true
            }
        ).exec());

        if (updatedGig) {
            const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
            await updateIndexedData("gigs", updatedGig._id!.toString(), gigOmit_Id);
        }

        return updatedGig;
    } catch (error) {
        logger.error("GigService updateGig() method error", error)
        if (error instanceof CustomError) {
            throw error
        }

        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function updateActiveGigProp(
    gigId: string,
    active: boolean
): Promise<ISellerGig | null> {
    try {
        if (!isValidObjectId(gigId)) {
            throw new BadRequestError("Invalid gig id", "GigService updateActiveGigProp() method")
        }

        const updatedGig = (await GigModel.findOneAndUpdate(
            { _id: gigId },
            {
                $set: {
                    active
                }
            },
            {
                new: true,
            }
        ).exec());

        if (updatedGig) {
            const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
            await updateIndexedData("gigs", gigOmit_Id.id!.toString(), gigOmit_Id);
        }

        return updatedGig;
    } catch (error) {
        logger.error("GigService updateActiveGigProp() method error", error)
        if (error instanceof CustomError) {
            throw error
        }

        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function updateGigReview(
    request: IReviewMessageDetails
): Promise<void> {
    try {
        if (!isValidObjectId(request.gigId)) {
            throw new BadRequestError("Invalid gig id", "GigService updateGigReview() method")
        }

        const ratingTypes: IRatingTypes = {
            "1": "one",
            "2": "two",
            "3": "three",
            "4": "four",
            "5": "five"
        };
        const ratingKey: string = ratingTypes[`${request.rating}`];

        const updatedGig = (await GigModel.findOneAndUpdate(
            { _id: request.gigId, sellerId: request.sellerId },
            {
                $inc: {
                    ratingsCount: 1, // sum of user rating
                    ratingSum: request.rating, // sum of star
                    [`ratingCategories.${ratingKey}.value`]: request.rating,
                    [`ratingCategories.${ratingKey}.count`]: 1
                }
            },
            { new: true, upsert: true }
        ).exec());

        if (updatedGig) {
            const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
            await updateIndexedData("gigs", updatedGig._id!.toString(), gigOmit_Id);
        }
    } catch (error) {
        logger.error("GigService updateGigReview() method error", error)
        if (error instanceof CustomError) {
            throw error
        }

        throw new Error("Unexpected error occured. Please try again.")
    }
}

export async function findGigsSearchBySellerId(
    searchQuery: string,
    active: boolean
): Promise<ISearchResult> {
    // try it on elasticsearch dev tools
    const queryList: IQueryList[] = [
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
        const result: SearchResponse = await elasticSearchClient.search({
            index: "gigs",
            query: {
                bool: {
                    must: queryList
                }
            }
        });

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        logger.error("GigService gigsSearchBySellerId() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function gigsSearch(
    searchQuery: string,
    paginate: IPaginateProps,
    min: number,
    max: number,
    deliveryTime?: string,
): Promise<ISearchResult> {
    const { from, size, type } = paginate;
    // try it on elasticsearch dev tools
    const queryList: IQueryList[] = [
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
        const result: SearchResponse = await elasticSearchClient.search({
            index: "gigs",
            size,
            query: {
                bool: {
                    must: queryList
                }
            },
            sort: [
                {
                    sortId: type === "forward" ? "asc" : "desc"
                }
            ],
            // startFrom for pagination
            ...(from !== "0" && { search_after: [from] })
        });

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        logger.error("GigService gigsSearch() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function gigsSearchByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    try {
        const result: SearchResponse = await elasticSearchClient.search({
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

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        logger.error("GigService gigsSearchByCategory() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function getMoreGigsLikeThis(
    gigId: string
): Promise<ISearchResult> {
    try {
        const result: SearchResponse = await elasticSearchClient.search({
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

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        logger.error("GigService getMoreGigsLikeThis() method error:", error);
        return { total: 0, hits: [] };
    }
}

export async function getTopRatedGigsByCategory(
    searchQuery: string
): Promise<ISearchResult> {
    try {
        const result: SearchResponse = await elasticSearchClient.search({
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

        const total: IHitsTotal = result.hits.total as IHitsTotal;
        const hits = result.hits.hits;

        return { total: total.value, hits };
    } catch (error) {
        logger.error(
            "GigService getTopRatedGigsByCategory() method error:",
            error
        );
        return { total: 0, hits: [] };
    }
}

export async function seedData(
    sellers: ISellerDocument[],
    count: string
): Promise<void> {
    const categories: string[] = [
        "Graphic & Design",
        "Digital Marketing",
        "Writing & Translation",
        "Video & Animation",
        "Music & Audio",
        "Programming & Tech",
        "Data",
        "Business"
    ];

    const expectedDeliveries: string[] = [
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

    for (let i = 0; i < sellers.length; i++) {
        const sellerDoc: ISellerDocument = sellers[i];
        const title = `I will ${faker.word.words(5)}`;
        const basicTitle = faker.commerce.productName();
        const basicDescription = faker.commerce.productDescription();
        const rating = sample(randomRatings);
        const gig: ISellerGig = {
            profilePicture: sellerDoc.profilePicture,
            sellerId: sellerDoc._id,
            email: sellerDoc.email,
            username: sellerDoc.username,
            title: title.length <= 80 ? title : title.slice(0, 80),
            basicTitle:
                basicTitle.length <= 40 ? basicTitle : basicTitle.slice(0, 40),
            basicDescription:
                basicDescription.length <= 100
                    ? basicDescription
                    : basicDescription.slice(0, 100),
            categories: `${sample(categories)}`,
            subCategories: [
                faker.commerce.department(),
                faker.commerce.department(),
                faker.commerce.department()
            ],
            description: faker.lorem.sentences({ min: 2, max: 4 }),
            tags: [
                faker.commerce.product(),
                faker.commerce.product(),
                faker.commerce.product(),
                faker.commerce.product()
            ],
            price: parseInt(faker.commerce.price({ min: 20, max: 30, dec: 0 })),
            coverImage: faker.image.urlPicsumPhotos(),
            expectedDelivery: `${sample(expectedDeliveries)}`,
            sortId: parseInt(count) + i + 1,
            ratingsCount: (i + 1) % 4 === 0 ? rating!.count : 0,
            ratingSum: (i + 1) % 4 === 0 ? rating!.sum : 0
        };

        console.log(`***SEEDING GIG*** - ${i + 1} of ${count}`);
        await createGig(gig);
    }
}
