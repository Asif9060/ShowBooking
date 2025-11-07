import createError from "http-errors";
import multer from "multer";
import MediaAsset from "../models/MediaAsset.js";
import AppConfig from "../models/AppConfig.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
   uploadBufferToCloudinary,
   deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const listMedia = asyncHandler(async (_req, res) => {
   const media = await MediaAsset.find().sort({ createdAt: -1 });
   res.json(media);
});

export const uploadMedia = asyncHandler(async (req, res, next) => {
   if (!req.file) {
      return next(createError(400, "No file uploaded."));
   }

   const { type = "poster", movieId, visibility = "public" } = req.body;

   try {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
         folder: "show-booking/media",
      });

      const asset = await MediaAsset.create({
         type,
         movieId,
         visibility,
         publicId: result.public_id,
         url: result.url,
         secureUrl: result.secure_url,
         format: result.format,
         bytes: result.bytes,
         width: result.width,
         height: result.height,
         duration: result.duration,
         folder: result.folder,
      });

      res.status(201).json(asset);
   } catch (error) {
      next(createError(500, "Media upload failed.", { details: error.message }));
   }
});

export const deleteMedia = asyncHandler(async (req, res, next) => {
   const asset = await MediaAsset.findById(req.params.id);
   if (!asset) {
      return next(createError(404, "Media asset not found."));
   }

   await deleteFromCloudinary(asset.publicId);

   await asset.deleteOne();
   res.status(204).send();
});

export const assignMedia = asyncHandler(async (req, res, next) => {
   const asset = await MediaAsset.findById(req.params.id);
   if (!asset) {
      return next(createError(404, "Media asset not found."));
   }

   if (asset.type === "backgroundVideo") {
      const config = await AppConfig.findByIdAndUpdate(
         "singleton",
         {
            backgroundVideoId: asset.publicId,
            backgroundVideoUrl: asset.secureUrl || asset.url,
         },
         { new: true, upsert: true }
      );
      return res.json({ config });
   }

   res.json({ asset });
});
