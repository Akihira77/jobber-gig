import { Request, Response } from "express";
import {
    getGigById,
    getSellerActiveGigs,
    getSellerInactiveGigs
} from "@gig/services/gig.service";
import { StatusCodes } from "http-status-codes";
import { getUserSelectedGigCategory } from "@gig/redis/gig.cache";
import { ISearchResult, ISellerGig } from "@Akihira77/jobber-shared";
import {
    getMoreGigsLikeThis,
    getTopRatedGigsByCategory,
    gigsSearchByCategory
} from "@gig/services/search.service";

export async function gigById(req: Request, res: Response): Promise<void> {
    const gig = await getGigById(req.params.gigId);

    res.status(StatusCodes.OK).json({
        message: "Get gig by id",
        gig
    });
}

export async function sellerActiveGigs(
    req: Request,
    res: Response
): Promise<void> {
    const gigs = await getSellerActiveGigs(req.params.sellerId);

    res.status(StatusCodes.OK).json({
        message: "Seller active gigs",
        gigs
    });
}

export async function sellerInactiveGigs(
    req: Request,
    res: Response
): Promise<void> {
    const gigs = await getSellerInactiveGigs(req.params.sellerId);

    res.status(StatusCodes.OK).json({
        message: "Seller inactive gigs",
        gigs
    });
}

export async function topRatedGigsByCategory(
    req: Request,
    res: Response
): Promise<void> {
    const category = await getUserSelectedGigCategory(
        `selectedCategories:${req.params.username}`
    );
    const resultHits: ISellerGig[] = [];
    const gigs: ISearchResult = await getTopRatedGigsByCategory(`${category}`);

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    res.status(StatusCodes.OK).json({
        message: "Search top gigs results",
        total: gigs.total,
        gigs: resultHits
    });
}

export async function gigsByCategory(
    req: Request,
    res: Response
): Promise<void> {
    const category = await getUserSelectedGigCategory(
        `selectedCategories:${req.params.username}`
    );
    const resultHits: ISellerGig[] = [];
    const gigs: ISearchResult = await gigsSearchByCategory(`${category}`);

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    res.status(StatusCodes.OK).json({
        message: "Search gigs category results",
        total: gigs.total,
        gigs: resultHits
    });
}

export async function gigsMoreLikeThis(
    req: Request,
    res: Response
): Promise<void> {
    const resultHits: ISellerGig[] = [];
    const gigs: ISearchResult = await getMoreGigsLikeThis(req.params.gigId);

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    res.status(StatusCodes.OK).json({
        message: "Search gigs more like this results",
        total: gigs.total,
        gigs: resultHits
    });
}
