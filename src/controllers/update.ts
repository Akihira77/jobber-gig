import { UploadApiResponse } from "cloudinary";
import {
    BadRequestError,
    ISellerGig,
    isDataURL,
    uploads
} from "@Akihira77/jobber-shared";
import { gigUpdateSchema } from "@gig/schemas/gig.schema";
import { Request, Response } from "express";
import { updateActiveGigProp, updateGig } from "@gig/services/gig.service";
import { StatusCodes } from "http-status-codes";

export async function gig(req: Request, res: Response): Promise<void> {
    const { error } = gigUpdateSchema.validate(req.body);

    if (error?.details) {
        throw new BadRequestError(
            error.details[0].message,
            "Update gig() method"
        );
    }

    // check if base64
    // if yes then user uploading a new image
    // if no then image is not changing
    const isNewImage = isDataURL(req.body.coverImage);
    let coverImage = req.body.coverImage;

    if (isNewImage) {
        const result = (await uploads(
            req.body.coverImage
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
        title: req.body.title,
        description: req.body.description,
        categories: req.body.categories,
        subCategories: req.body.subCategories,
        tags: req.body.tags,
        price: req.body.price,
        expectedDelivery: req.body.expectedDelivery,
        basicTitle: req.body.basicTitle,
        basicDescription: req.body.basicDescription,
        coverImage
    };

    const updatedGig = await updateGig(req.params.gigId, gigData);

    res.status(StatusCodes.OK).json({
        message: "Gig updated successfully.",
        gig: updatedGig
    });
}

export async function gigUpdateActiveStatus(
    req: Request,
    res: Response
): Promise<void> {
    const updatedGig = await updateActiveGigProp(
        req.params.gigId,
        req.body.active
    );

    res.status(StatusCodes.OK).json({
        message: "Gig active status updated successfully.",
        gig: updatedGig
    });
}
