import { winstonLogger } from "@Akihira77/jobber-shared";
import { ELASTIC_SEARCH_URL } from "@gig/config";
import { databaseConnection } from "@gig/database";
import { GigQueue } from "@gig/queues/gig.queue";
import { Logger } from "winston";

import { GigService } from "../gig.service";

const logger = (moduleName?: string): Logger =>
    winstonLogger(
        `${ELASTIC_SEARCH_URL}`,
        moduleName ?? "Gig Service",
        "debug"
    );

let gigService: GigService;
let db: any;

// let gigId = "664d6353cf0fec9ffb355e33";
beforeAll(async () => {
    db = await databaseConnection(logger);
    const queue = new GigQueue(null, logger);
    gigService = new GigService(queue, logger);
    // const { hits } =
    //     await gigService.gigsSearchByCategoryElasticDb("Video & Animation");
    // if (hits.length > 0 && hits[0]._source) {
    //     const gig = hits[0]._source as any;
    //     gigId = gig["id"];
    // }
});

afterAll(async () => {
    await db.connection.close();
});

// describe("gig.service.ts - updateGig() method", () => {
//     afterAll(async () => {
//         await gigService.updateGig(gigId, {
//             sellerId: "6644215d6fdffcf6c3a6d8da",
//             title: "I will till woot astride youthfully ick",
//             description:
//                 "Sustineo aduro omnis celer curto veritatis celo delectatio absum. Velit tamen curo audeo necessitatibus aegre sono tredecim. Argentum rerum excepturi est degusto volo tripudio sui. Consectetur tabgo adfectus.",
//             basicTitle: "Practical Rubber Car",
//             basicDescription:
//                 "The Apollotech B340 is an affordable wireless mouse with reliable connectivity, 12 months battery li",
//             categories: "Video & Animation",
//             subCategories: ["Industrial", "Jewelery", "Jewelery"],
//             tags: ["Computer", "Tuna", "Table", "Chair"],
//             expectedDelivery: "4 Days Delivery",
//             ratingsCount: 0,
//             ratingSum: 0,
//             ratingCategories: {
//                 five: { value: 0, count: 0 },
//                 four: { value: 0, count: 0 },
//                 three: { value: 0, count: 0 },
//                 two: { value: 0, count: 0 },
//                 one: { value: 0, count: 0 }
//             },
//             price: 30,
//             coverImage: "https://picsum.photos/seed/rQTshNWEtG/640/480"
//         });
//     });

//     // const newGigData = {
//     //     title: "This is updated data",
//     //     description: "This is updated data",
//     //     categories: "Programming & Tech",
//     //     subCategories: ["Program", "Web", "Application"],
//     //     tags: ["Web", "ReactJS", "Frontend", "Fullstack"],
//     //     price: 15,
//     //     coverImage: "https://picsum.photos/seed/jRKYz/640/480",
//     //     expectedDelivery: "3 Days Delivery",
//     //     basicTitle: "This is updated data",
//     //     basicDescription: "This is updated data",
//     //     sellerId: "6644215d6fdffcf6c3a6d8da"
//     // };
//     // it("Should saved to mongodb and elasticsearch and the new data must exactly same", async () => {
//     //     const updatedGigFromMongo = (await gigService.updateGig(
//     //         gigId,
//     //         newGigData
//     //     ))!;
//     //     const updatedGigFromElastic =
//     //         await gigService.getGigByIdElasticDb(gigId);

//     //     let sellerId = updatedGigFromMongo.sellerId?.toString();
//     //     expect(updatedGigFromMongo.title).toBe(newGigData.title);
//     //     expect(updatedGigFromMongo.description).toBe(newGigData.description);
//     //     expect(updatedGigFromMongo.categories).toBe(newGigData.categories);
//     //     expect(updatedGigFromMongo.subCategories).toEqual(
//     //         newGigData.subCategories
//     //     );
//     //     expect(updatedGigFromMongo.tags).toEqual(newGigData.tags);
//     //     expect(updatedGigFromMongo.price).toBe(newGigData.price);
//     //     expect(updatedGigFromMongo.coverImage).toBe(newGigData.coverImage);
//     //     expect(updatedGigFromMongo.expectedDelivery).toBe(
//     //         newGigData.expectedDelivery
//     //     );
//     //     expect(updatedGigFromMongo.basicTitle).toBe(newGigData.basicTitle);
//     //     expect(updatedGigFromMongo.basicDescription).toBe(
//     //         newGigData.basicDescription
//     //     );
//     //     expect(sellerId).toBe(newGigData.sellerId);

//     //     expect(updatedGigFromMongo.title).toBe(updatedGigFromElastic.title);
//     //     expect(updatedGigFromMongo.description).toBe(
//     //         updatedGigFromElastic.description
//     //     );
//     //     expect(updatedGigFromMongo.categories).toBe(
//     //         updatedGigFromElastic.categories
//     //     );
//     //     expect(updatedGigFromMongo.subCategories).toEqual(
//     //         updatedGigFromElastic.subCategories
//     //     );
//     //     expect(updatedGigFromMongo.tags).toEqual(updatedGigFromElastic.tags);
//     //     expect(updatedGigFromMongo.price).toBe(updatedGigFromElastic.price);
//     //     expect(updatedGigFromMongo.coverImage).toBe(
//     //         updatedGigFromElastic.coverImage
//     //     );
//     //     expect(updatedGigFromMongo.expectedDelivery).toBe(
//     //         updatedGigFromElastic.expectedDelivery
//     //     );
//     //     expect(updatedGigFromMongo.basicTitle).toBe(
//     //         updatedGigFromElastic.basicTitle
//     //     );
//     //     expect(updatedGigFromMongo.basicDescription).toBe(
//     //         updatedGigFromElastic.basicDescription
//     //     );
//     //     expect(sellerId).toBe(updatedGigFromElastic.sellerId);
//     // });

//     // it("Should throw an error Invalid gig id #1 - updateGig() method", async () => {
//     //     await expect(
//     //         gigService.updateGig("wrong-gig-id", newGigData)
//     //     ).rejects.toThrow("Invalid gig id");
//     // });

//     // it("Should throw an error Invalid gig id #2 - updateGig() method", async () => {
//     //     await expect(
//     //         gigService.updateGig("65e9e422a18101bb1b1b595p", newGigData)
//     //     ).rejects.toThrow("Invalid gig id");
//     // });
// });

describe("upsertGigReview() method", () => {
    const gigId = "664d6353cf0fec9ffb355e33";
    it("Should success updating gig's review - upsertGigReview() method", async () => {
        const gigBeforeUpdateMongo = await gigService.getGigByIdMongoDb(gigId);
        const updatedGigFromMongo = await gigService.upsertGigReview({
            gigId,
            type: "buyer-review",
            rating: 5,
            sellerId: "6644215d6fdffcf6c3a6d8da"
        });
        const updatedGigFromElastic =
            await gigService.getGigByIdElasticDb(gigId);

        expect(gigBeforeUpdateMongo.ratingSum! + 5).toEqual(
            updatedGigFromMongo.ratingSum
        );
        expect(gigBeforeUpdateMongo.ratingsCount! + 1).toEqual(
            updatedGigFromMongo.ratingsCount
        );
        expect(gigBeforeUpdateMongo.ratingCategories?.five).toEqual({
            value: updatedGigFromMongo.ratingCategories!.five.value - 5,
            count: updatedGigFromMongo.ratingCategories!.five.count - 1
        });
        expect(gigBeforeUpdateMongo.ratingCategories?.four).toEqual(
            updatedGigFromMongo.ratingCategories?.four
        );
        expect(gigBeforeUpdateMongo.ratingCategories?.three).toEqual(
            updatedGigFromMongo.ratingCategories?.three
        );
        expect(gigBeforeUpdateMongo.ratingCategories?.two).toEqual(
            updatedGigFromMongo.ratingCategories?.two
        );
        expect(gigBeforeUpdateMongo.ratingCategories?.one).toEqual(
            updatedGigFromMongo.ratingCategories?.one
        );

        expect(updatedGigFromMongo.ratingSum).toEqual(
            updatedGigFromElastic.ratingSum
        );
        expect(updatedGigFromMongo.ratingsCount).toEqual(
            updatedGigFromElastic.ratingsCount
        );
        expect(updatedGigFromMongo.ratingCategories).toEqual(
            updatedGigFromElastic.ratingCategories
        );
    });

    it("Should throw an error Invalid gig id - upsertGigReview() method", async () => {
        await expect(
            gigService.upsertGigReview({
                gigId: "65e9e422a18101bb1b1b595p",
                type: "buyer-review",
                rating: 5,
                sellerId: "6644215d6fdffcf6c3a6d8da"
            })
        ).rejects.toThrow("Invalid gig id");
    });
});
