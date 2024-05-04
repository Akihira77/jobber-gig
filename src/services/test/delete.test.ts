import { databaseConnection } from "@gig/database"
import { startElasticSearch } from "@gig/server";
import { deleteGig } from "../gig.service";

describe("Delete Gig", () => {
    beforeAll(async () => {
        startElasticSearch();
        await databaseConnection();
    });

    describe("deleteGig() method", () => {
        it("invalid id case", async () => {
            await expect(deleteGig("wrong-id", "wrong-id")).rejects.toThrow("Invalid gig id");
        });

        it("gig not found", async () => {
            await expect(deleteGig("66233d74175bbacb89d180fa", "66233d74175bbacb89d180fa")).rejects.toThrow("Gig is not found");
        });
    });
})
