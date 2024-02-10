import { Request } from "express";
import {
    authUserPayload,
    gigMockRequest,
    gigMockResponse,
    sellerGig
} from "@gig/controllers/test/mocks/gig.mock";
import { gigCreateSchema } from "@gig/schemas/gig.schema";
import * as create from "@gig/controllers/create";
import * as gigService from "@gig/services/gig.service";
import * as helper from "@Akihira77/jobber-shared";

jest.mock("@gig/services/gig.service");
jest.mock("@Akihira77/jobber-shared");
jest.mock("@gig/schemas/gig.schema");
jest.mock("@gig/elasticsearch");
jest.mock("@elastic/elasticsearch");

describe("Gig controller", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Create method", () => {
        it("Should throw an error for invalid schema data", () => {
            const req = gigMockRequest(
                {},
                sellerGig,
                authUserPayload
            ) as unknown as Request;
            const res = gigMockResponse();

            jest.spyOn(gigCreateSchema, "validate").mockImplementation(
                (): any => {
                    return Promise.resolve({
                        error: {
                            name: "ValidationError",
                            isJoi: true,
                            details: [{ message: "This is an error message" }]
                        }
                    });
                }
            );

            create.gig(req, res).catch(() => {
                expect(helper.BadRequestError).toHaveBeenCalledWith(
                    "This is an error message",
                    "Create gig() method"
                );
            });
        });

        it("Should throw an upload error", () => {
            const req = gigMockRequest(
                {},
                sellerGig,
                authUserPayload
            ) as unknown as Request;
            const res = gigMockResponse();

            jest.spyOn(gigCreateSchema, "validate").mockImplementation(
                (): any => {
                    return Promise.resolve({
                        error: {}
                    });
                }
            );

            jest.spyOn(helper, "uploads").mockImplementation((): any => {
                return Promise.resolve({
                    public_id: ""
                });
            });
            create.gig(req, res).catch(() => {
                expect(helper.BadRequestError).toHaveBeenCalledWith(
                    "File upload error. Try again.",
                    "Create gig() method"
                );
            });
        });

        it("Should create a new gig and return the correct response", async () => {
            const req = gigMockRequest(
                {},
                sellerGig,
                authUserPayload
            ) as unknown as Request;
            const res = gigMockResponse();

            jest.spyOn(gigCreateSchema, "validate").mockImplementation(
                (): any => {
                    return Promise.resolve({
                        error: {}
                    });
                }
            );

            jest.spyOn(helper, "uploads").mockImplementation((): any => {
                return Promise.resolve({
                    public_id: "123456"
                });
            });

            jest.spyOn(gigService, "createGig").mockResolvedValue(sellerGig);

            await create.gig(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Gig created successfully.",
                gig: sellerGig
            });
        });
    });
});
