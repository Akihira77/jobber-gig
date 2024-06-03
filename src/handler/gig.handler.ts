import {
    BadRequestError,
    uploads,
    ISellerGig,
    ISearchResult,
    IPaginateProps,
    isDataURL,
    IAuthPayload
} from "@Akihira77/jobber-shared";
import { exchangeNamesAndRoutingKeys } from "@gig/config";
import { ElasticSearchClient } from "@gig/elasticsearch";
import { GigQueue } from "@gig/queues/gig.queue";
import { GigRedis } from "@gig/redis/gig.redis";
import { gigCreateSchema, gigUpdateSchema } from "@gig/schemas/gig.schema";
import { GigService } from "@gig/services/gig.service";
import { UploadApiResponse } from "cloudinary";
import { sortBy } from "lodash";
import { Logger } from "winston";

export class GigHandler {
    private redisClient: GigRedis;
    constructor(
        private gigService: GigService,
        private elastic: ElasticSearchClient,
        private queue: GigQueue,
        logger: (moduleName: string) => Logger
    ) {
        this.redisClient = new GigRedis(logger);
    }

    async addGig(reqBody: any, currUser: IAuthPayload): Promise<ISellerGig> {
        const { error, value } = gigCreateSchema.validate(reqBody);

        if (error?.details) {
            throw new BadRequestError(
                error.details[0].message,
                "Create gig() method"
            );
        }

        const result = (await uploads(value.coverImage)) as UploadApiResponse;

        if (!result?.public_id) {
            throw new BadRequestError(
                "File upload error. Try again.",
                "Create gig() method"
            );
        }
        const documentCount = await this.elastic.getDocumentCount("gigs");

        const gigData: ISellerGig = {
            sellerId: value.sellerId,
            username: currUser.username,
            email: currUser.email,
            profilePicture: value.profilePicture,
            title: value.title,
            description: value.description,
            categories: value.categories,
            subCategories: value.subCategories,
            tags: value.tags,
            price: value.price,
            expectedDelivery: value.expectedDelivery,
            basicTitle: value.basicTitle,
            basicDescription: value.basicDescription,
            coverImage: `${result?.secure_url}`,
            sortId: documentCount + 1
        };

        const createdGig = await this.gigService.createGig(gigData);

        return createdGig;
    }

    async removeGig(gigId: string, sellerId: string): Promise<void> {
        await this.gigService.deleteGig(gigId, sellerId);

        return;
    }

    async getGigById(gigId: string): Promise<ISellerGig> {
        const gig = await this.gigService.getGigByIdElasticDb(gigId);

        return gig;
    }

    async getSellerActiveGigs(sellerId: string): Promise<ISellerGig[]> {
        const gigs = await this.gigService.getSellerActiveGigsMongoDb(sellerId);

        return gigs;
    }

    async getSellerInactiveGigs(sellerId: string): Promise<ISellerGig[]> {
        const gigs =
            await this.gigService.getSellerInactiveGigsMongoDb(sellerId);

        return gigs;
    }

    async getTopRatedGigsByCategory(
        username: string
    ): Promise<{ resultHits: ISellerGig[]; total: number }> {
        const category = await this.redisClient.getUserSelectedGigCategory(
            `selectedCategories:${username}`
        );
        const resultHits: ISellerGig[] = [];
        const gigs: ISearchResult =
            await this.gigService.getTopRatedGigsByCategoryElasticDb(
                `${category}`
            );

        for (const item of gigs.hits) {
            resultHits.push(item._source as ISellerGig);
        }

        return { resultHits, total: gigs.total };
    }

    async getGigsByCategory(
        username: string
    ): Promise<{ resultHits: ISellerGig[]; total: number }> {
        const category = await this.redisClient.getUserSelectedGigCategory(
            `selectedCategories:${username}`
        );
        const resultHits: ISellerGig[] = [];
        const gigs: ISearchResult =
            await this.gigService.gigsSearchByCategoryElasticDb(`${category}`);

        for (const item of gigs.hits) {
            resultHits.push(item._source as ISellerGig);
        }

        return { resultHits, total: gigs.total };
    }

    async getGigsMoreLikeThis(
        gigId: string
    ): Promise<{ resultHits: ISellerGig[]; total: number }> {
        const resultHits: ISellerGig[] = [];
        const gigs: ISearchResult =
            await this.gigService.getMoreGigsLikeThisElasticDb(gigId);

        for (const item of gigs.hits) {
            resultHits.push(item._source as ISellerGig);
        }

        return { resultHits, total: gigs.total };
    }

    async getGigsQuerySearch(
        params: IPaginateProps,
        query: string,
        delivery_time: string,
        min: number,
        max: number
    ): Promise<{ resultHits: ISellerGig[]; total: number }> {
        let resultHits: ISellerGig[] = [];
        const gigs: ISearchResult = await this.gigService.gigsSearchElasticDb(
            query,
            params,
            min,
            max,
            delivery_time
        );

        for (const item of gigs.hits) {
            resultHits.push(item._source as ISellerGig);
        }

        if (params.type === "backward") {
            resultHits = sortBy(resultHits, ["sortId"]);
        }

        return { resultHits, total: gigs.total };
    }

    async updateGig(gigId: string, reqBody: any): Promise<ISellerGig | null> {
        const { error, value } = gigUpdateSchema.validate(reqBody);

        if (error?.details) {
            throw new BadRequestError(
                error.details[0].message,
                "Update gig() method"
            );
        }

        // check if base64
        // if yes then user uploading a new image
        // if no then image is not changing
        const isNewImage = isDataURL(value.coverImage);
        let coverImage = value.coverImage;

        if (isNewImage) {
            const result = (await uploads(
                value.coverImage
            )) as UploadApiResponse;

            if (!result?.public_id) {
                throw new BadRequestError(
                    "File upload error. Try again.",
                    "Update gig() method"
                );
            }

            coverImage = result?.secure_url;
        }

        const gigData: ISellerGig = {
            title: value.title,
            description: value.description,
            categories: value.categories,
            subCategories: value.subCategories,
            tags: value.tags,
            price: value.price,
            expectedDelivery: value.expectedDelivery,
            basicTitle: value.basicTitle,
            basicDescription: value.basicDescription,
            coverImage
        };

        const updatedGig = await this.gigService.updateGig(gigId, gigData);

        return updatedGig;
    }

    async updateActiveStatusGig(
        gigId: string,
        active: boolean
    ): Promise<ISellerGig | null> {
        const updatedGig = await this.gigService.updateActiveGigProp(
            gigId,
            active
        );

        return updatedGig;
    }

    async populateGigs(count: number): Promise<void> {
        const { gigService } = exchangeNamesAndRoutingKeys;

        await this.queue.publishDirectMessage(
            gigService.getSellers.exchangeName,
            gigService.getSellers.routingKey,
            JSON.stringify({ type: "getSellers", count }),
            "Gig seed message sent to users service."
        );

        return;
    }
}
