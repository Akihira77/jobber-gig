import {
    IPaginateProps,
    ISearchResult,
    ISellerGig
} from "@Akihira77/jobber-shared";
import { gigsSearch } from "@gig/services/search.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sortBy } from "lodash";

export async function gigsQuerySearch(
    req: Request,
    res: Response
): Promise<void> {
    const { from, size, type } = req.params;
    let resultHits: ISellerGig[] = [];
    const paginate: IPaginateProps = {
        from,
        size: parseInt(`${size}`),
        type
    };
    const { query, delivery_time, min, max } = req.query;

    const gigs: ISearchResult = await gigsSearch(
        `${query}`,
        paginate,
        `${delivery_time}`,
        parseInt(`${min}`),
        parseInt(`${max}`)
    );

    for (const item of gigs.hits) {
        resultHits.push(item._source as ISellerGig);
    }

    if (type === "backward") {
        resultHits = sortBy(resultHits, ["sortId"]);
    }

    res.status(StatusCodes.OK).json({
        message: "Search gigs results",
        total: gigs.total,
        gigs: resultHits
    });
}
