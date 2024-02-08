import {
    IRatingTypes,
    IReviewMessageDetails,
    ISellerDocument,
    ISellerGig
} from "@Akihira77/jobber-shared";
import { faker } from "@faker-js/faker";
import { exchangeNamesAndRoutingKeys } from "@gig/config";
import {
    addDataToIndex,
    deleteIndexedData,
    getIndexedData,
    updateIndexedData
} from "@gig/elasticsearch";
import { GigModel } from "@gig/models/gig.model";
import { publishDirectMessage } from "@gig/queues/gig.producer";
import { gigChannel } from "@gig/server";
import { gigsSearchBySellerId } from "@gig/services/search.service";
import { sample } from "lodash";

export async function getGigById(id: string): Promise<ISellerGig> {
    const gig = await getIndexedData("gigs", id);

    return gig;
}

export async function getSellerActiveGigs(
    sellerId: string
): Promise<ISellerGig[]> {
    const resultHits: ISellerGig[] = [];
    const gigs = await gigsSearchBySellerId(sellerId, true);

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    return resultHits;
}

export async function getSellerInactiveGigs(
    sellerId: string
): Promise<ISellerGig[]> {
    const resultHits: ISellerGig[] = [];
    const gigs = await gigsSearchBySellerId(sellerId, false);

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    return resultHits;
}

export async function createGig(request: ISellerGig): Promise<ISellerGig> {
    const createdGig = await GigModel.create(request);

    if (createdGig) {
        const gigOmit_Id = createdGig.toJSON?.() as ISellerGig;
        const { buyerService } = exchangeNamesAndRoutingKeys;

        await publishDirectMessage(
            gigChannel,
            buyerService.seller.exchangeName,
            buyerService.seller.routingKey,
            JSON.stringify({
                type: "update-gig-count",
                gigSellerId: `${gigOmit_Id.sellerId}`,
                count: 1
            }),
            "Details sent to users service"
        );
        await addDataToIndex("gigs", `${createdGig._id}`, gigOmit_Id);
    }

    return createdGig;
}

export async function deleteGig(
    gigId: string,
    sellerId: string
): Promise<void> {
    await GigModel.deleteOne({ _id: gigId }).exec();

    const { buyerService } = exchangeNamesAndRoutingKeys;

    await publishDirectMessage(
        gigChannel,
        buyerService.seller.exchangeName,
        buyerService.seller.routingKey,
        JSON.stringify({
            type: "update-gig-count",
            gigSellerId: sellerId,
            count: -1
        }),
        "Details sent to users service"
    );
    await deleteIndexedData("gigs", `${gigId}`);
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
    ).exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", `${updatedGig._id}`, gigOmit_Id);
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
    ).exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", `${updatedGig._id}`, gigOmit_Id);
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
    ).exec()) as ISellerGig;

    if (updatedGig) {
        const gigOmit_Id = updatedGig.toJSON?.() as ISellerGig;
        await updateIndexedData("gigs", `${updatedGig._id}`, gigOmit_Id);
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
        "Music & Video",
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
