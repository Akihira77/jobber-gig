import { databaseConnection } from "@gig/database";
import { startElasticSearch } from "@gig/server";
import * as gigService from "@gig/services/gig.service";
import { ISellerGig } from "@Akihira77/jobber-shared";

describe("Update Gig", () => {
    beforeAll(async () => {
        startElasticSearch();
        await databaseConnection();
    });

    const gigId = "66233d74175bbacb89d180f8";
    afterAll(async () => {
        await gigService.updateGig(gigId, {
            title: "I will supposing since expostulate meh zesty",
            description:
                "Ventito sordeo copiose teres aedificium compello sopor demo. Mollitia argentum careo angelus aperiam vergo quis utor.",
            basicTitle: "Elegant Rubber Keyboard",
            basicDescription:
                "Carbonite web goalkeeper gloves are ergonomically designed to give easy fit",
            categories: "Music & Video",
            subCategories: ["Sports", "Outdoors", "Books"],
            tags: ["Chair", "Mouse", "Car", "Table"],
            expectedDelivery: "3 Days Delivery",
            ratingsCount: 2,
            ratingSum: 10,
            ratingCategories: {
                five: { value: 0, count: 0 },
                four: { value: 0, count: 0 },
                three: { value: 0, count: 0 },
                two: { value: 0, count: 0 },
                one: { value: 0, count: 0 }
            },
            price: 30,
            coverImage: "https://picsum.photos/seed/rQTshNWEtG/640/480"
        });
    });

    describe("updateGig() method", () => {
        it("should be saved to mongodb and elasticsearch and they must be exactly same", async () => {
            const reqBody = {
                title: "This is updated data",
                description: "This is updated data",
                categories: "Programming & Tech",
                subCategories: ["Program", "Web", "Application"],
                tags: ["Web", "ReactJS", "Frontend", "Fullstack"],
                price: 15,
                coverImage: "https://picsum.photos/seed/jRKYz/640/480",
                expectedDelivery: "3 Days Delivery",
                basicTitle: "This is updated data",
                basicDescription: "This is updated data",
                sellerId: "65e9cc021d2eacf8631ba6da"
            };

            await gigService.updateGig(gigId, reqBody);

            const result = await gigService.getGigById(gigId);
            expect(result.title).toBe(reqBody.title);
            expect(result.description).toBe(reqBody.description);
            expect(result.categories).toBe(reqBody.categories);
            expect(result.subCategories).toEqual(reqBody.subCategories);
            expect(result.tags).toEqual(reqBody.tags);
            expect(result.price).toBe(reqBody.price);
            expect(result.coverImage).toBe(reqBody.coverImage);
            expect(result.expectedDelivery).toBe(reqBody.expectedDelivery);
            expect(result.basicTitle).toBe(reqBody.basicTitle);
            expect(result.basicDescription).toBe(reqBody.basicDescription);
        });

        it("incorrect gigId - should return null", async () => {
            await expect(
                gigService.updateGig(
                    "65e9e422a18101bb1b1b595p",
                    {} as ISellerGig
                )
            ).rejects.toThrow("Invalid gig id");
        });
    });

    describe("updateActiveGigProp() method", () => {
        it("should be saved to mongodb and elasticsearch and they must be exactly same 1", async () => {
            const result = await gigService.updateActiveGigProp(gigId, false);
            const gig = await gigService.getGigById(gigId);

            expect(result?.active).toEqual(gig.active);
        });

        it("should be saved to mongodb and elasticsearch and they must be exactly same 2", async () => {
            const result = await gigService.updateActiveGigProp(gigId, true);
            const gig = await gigService.getGigById(gigId);

            expect(result?.active).toEqual(gig.active);
        });

        it("incorrect gigId - should return null", async () => {
            await expect(
                gigService.updateActiveGigProp("65e9e422a18101bb1b1b595p", true)
            ).rejects.toThrow("Invalid gig id");
        });
    });

    describe("updateGigReview() method", () => {
        it("success case", async () => {
            const prevGig = await gigService.getGigById(gigId);
            await gigService.updateGigReview({
                gigId,
                type: "buyer-review",
                rating: 5,
                sellerId: "65e9cc021d2eacf8631ba6da"
            });
            const currGig = await gigService.getGigById(gigId);

            expect(prevGig.ratingSum).toEqual(currGig.ratingSum! - 5);
            expect(prevGig.ratingsCount).toEqual(currGig.ratingsCount! - 1);
            expect(prevGig.ratingCategories?.five).toEqual({
                value: currGig.ratingCategories!.five.value - 5,
                count: currGig.ratingCategories!.five.count - 1
            });
        });

        it("incorrect gigId - should return null", async () => {
            await expect(
                gigService.updateGigReview({
                    gigId: "65e9e422a18101bb1b1b595p",
                    type: "buyer-review",
                    rating: 5
                })
            ).rejects.toThrow("Invalid gig id");
        });
    });
});
