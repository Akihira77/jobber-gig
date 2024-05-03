import {
    BadRequestError,
    IRatingTypes,
    IReviewMessageDetails,
    ISellerDocument,
    ISellerGig,
    winstonLogger
} from "@Akihira77/jobber-shared";
import { faker } from "@faker-js/faker";
import { ELASTIC_SEARCH_URL, exchangeNamesAndRoutingKeys } from "@gig/config";
import {
    addDataToIndex,
    deleteIndexedData,
    getIndexedData,
    updateIndexedData
} from "@gig/elasticsearch";
import { GigModel } from "@gig/models/gig.model";
import { publishDirectMessage } from "@gig/queues/gig.producer";
import { gigChannel } from "@gig/server";
import { sample } from "lodash";
import cloudinary from "cloudinary";
import { Logger } from "winston";

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
            .lean()
            .exec();

        gigs.forEach((gig) => {
            const gigOmit_Id = gig.toJSON?.() as ISellerGig;
            results.push(gigOmit_Id);
        });

        return results;
    } catch (error) {
        logger.error("GigService getSellerActiveGigs() method error", error);
        throw error;
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
            .lean()
            .exec();

        gigs.forEach((gig) => {
            const gigOmit_Id = gig.toJSON?.() as ISellerGig;
            results.push(gigOmit_Id);
        });

        return results;
    } catch (error) {
        logger.error("GigService getSellerInactiveGigs() method error", error);
        throw error;
    }
}

export async function createGig(request: ISellerGig): Promise<ISellerGig> {
    try {
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
        throw error;
    }
}

export async function deleteGig(
    gigId: string,
    sellerId: string
): Promise<void> {
    try {
        const result = await GigModel.findOneAndDelete({ _id: gigId })
            .lean()
            .exec();

        if (!result) {
            throw new BadRequestError(
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
        if (error) {
            logger.error("GigService deleteGig() method error", error);
            throw error;
        }

        throw new Error("Unexpected error occured. Please try again.");
    }
}

export async function updateGig(
    gigId: string,
    gigData: ISellerGig
): Promise<ISellerGig> {
    const updatedGig = (await GigModel.findOneAndUpdate(
        { _id: gigId },
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
    ).lean().exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", updatedGig._id!.toString(), gigOmit_Id);
    }

    return updatedGig;
}

export async function updateActiveGigProp(
    gigId: string,
    active: boolean
): Promise<ISellerGig> {
    const updatedGig = (await GigModel.findOneAndUpdate(
        { _id: gigId },
        {
            $set: {
                active
            }
        },
        {
            new: true
        }
    ).lean().exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", gigOmit_Id.id!.toString(), gigOmit_Id);
    }

    return updatedGig;
}

export async function updateGigReview(
    request: IReviewMessageDetails
): Promise<void> {
    const ratingTypes: IRatingTypes = {
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
        "5": "five"
    };
    const ratingKey: string = ratingTypes[`${request.rating}`];

    const updatedGig = (await GigModel.findOneAndUpdate(
        { _id: request.gigId },
        {
            $inc: {
                ratingsCount: 1, // sum of user rating
                ratingSum: request.rating, // sum of star
                [`ratingCategories.${ratingKey}.value`]: request.rating,
                [`ratingCategories.${ratingKey}.count`]: 1
            }
        },
        { new: true, upsert: true }
    ).lean().exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", updatedGig._id!.toString(), gigOmit_Id);
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
        "2 Day Delivery",
        "3 Day Delivery",
        "4 Day Delivery",
        "5 Day Delivery"
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
