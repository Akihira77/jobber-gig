import { UploadApiResponse } from "cloudinary";
import { BadRequestError, ISellerGig, uploads } from "@Akihira77/jobber-shared";
import { gigCreateSchema } from "@gig/schemas/gig.schema";
import { Request, Response } from "express";
import { createGig } from "@gig/services/gig.service";
import { StatusCodes } from "http-status-codes";
import { getDocumentCount } from "@gig/elasticsearch";

export async function gig(req: Request, res: Response): Promise<void> {
    const { error } = await Promise.resolve(gigCreateSchema.validate(req.body));

    if (error?.details) {
        throw new BadRequestError(
            error.details[0].message,
            "Create gig() method"
        );
    }

    const result = (await uploads(req.body.coverImage)) as UploadApiResponse;

    if (!result.public_id) {
        throw new BadRequestError(
            "File upload error. Try again.",
            "Create gig() method"
        );
    }

    const documentCount = await getDocumentCount("gigs");

    const gigData: ISellerGig = {
        sellerId: req.body.sellerId,
        username: req.currentUser!.username,
        email: req.currentUser!.email,
        profilePicture: req.body.profilePicture,
        title: req.body.title,
        description: req.body.description,
        categories: req.body.categories,
        subCategories: req.body.subCategories,
        tags: req.body.tags,
        price: req.body.price,
        expectedDelivery: req.body.expectedDelivery,
        basicTitle: req.body.basicTitle,
        basicDescription: req.body.basicDescription,
        coverImage: `${result?.secure_url}`,
        sortId: documentCount + 1
    };

    const createdGig = await createGig(gigData);

    res.status(StatusCodes.CREATED).json({
        message: "Gig created successfully.",
        gig: createdGig
    });
}
