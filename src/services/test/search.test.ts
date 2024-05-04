import { databaseConnection } from "@gig/database";
import { startElasticSearch } from "@gig/server"
import { getMoreGigsLikeThis, getTopRatedGigsByCategory, gigsSearch, gigsSearchBySellerId } from "../search.service";

describe("Read / Get Gig", () => {
    beforeAll(async () => {
        startElasticSearch();
        await databaseConnection();
    })

    const gigId = "66233d73175bbacb89d180ec"
    describe("gigsSearchBySellerId() method", () => {
        it("not found any data or total data 0", async () => {
            const { total } = await gigsSearchBySellerId("not-found-id", true);

            expect(total).toBe(0);
        })

        it("founds some data", async () => {
            const { total, hits } = await gigsSearchBySellerId("65e9cc021d2eacf8631ba6da", true);

            expect(total).not.toBe(0);
            expect(hits).not.toEqual([]);
        })
    })

    describe("gigsSearch() method", () => {
        it("founds some data", async () => {
            const { total, hits } = await gigsSearch("website", { from: "0", size: 10, type: "forward" }, "", "0", "20");

            expect(total).not.toBe(0);
            expect(hits).not.toEqual([]);
        })
    })

    describe("getMoreGigsLikeThis() method", () => {
        it("founds some data", async () => {
            const { total, hits } = await getMoreGigsLikeThis(gigId);

            expect(total).not.toBe(0);
            expect(hits).not.toEqual([]);
        })
    })

    describe("getTopRatedGigsByCategory() method", () => {
        it("founds some data", async () => {
            const { total, hits } = await getTopRatedGigsByCategory("Programming & Tech");

            expect(total).not.toBe(0);
            expect(hits).not.toEqual([]);
        })
    })
})
