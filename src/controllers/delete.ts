import { Request, Response } from "express";
import { deleteGig } from "@gig/services/gig.service";
import { StatusCodes } from "http-status-codes";

export async function gig(req: Request, res: Response): Promise<void> {
    await deleteGig(req.params.gigId, req.params.sellerId);

    res.status(StatusCodes.OK).json({
        message: "Gig deleted successfully."
    });
}
