import Joi from "joi";
import createError from "http-errors";
import AppConfig from "../models/AppConfig.js";
import Movie from "../models/Movie.js";
import asyncHandler from "../utils/asyncHandler.js";

const configSchema = Joi.object({
   brandTitle: Joi.string().trim().required(),
   tagline: Joi.string().trim().allow(""),
   supportEmail: Joi.string().email().allow(""),
   backgroundVideoId: Joi.string().allow(""),
   backgroundVideoUrl: Joi.string().uri().allow(""),
   seatMultipliers: Joi.object({
      front: Joi.number().min(0).default(1.5),
      middle: Joi.number().min(0).default(1.0),
      back: Joi.number().min(0).default(0.75),
   }).default(),
});

const ensureConfig = async () => {
   const existing = await AppConfig.findById("singleton");
   if (existing) return existing;
   return AppConfig.create({ _id: "singleton" });
};

export const getPublicConfig = asyncHandler(async (_req, res) => {
   const config = await ensureConfig();
   res.json(config);
});

export const getAdminConfig = asyncHandler(async (_req, res) => {
   const config = await ensureConfig();
   res.json(config);
});

export const updateConfig = asyncHandler(async (req, res, next) => {
   const { error, value } = configSchema.validate(req.body, { abortEarly: false });
   if (error) {
      return next(
         createError(422, "Configuration validation failed.", { details: error.details })
      );
   }

   const config = await AppConfig.findByIdAndUpdate("singleton", value, {
      new: true,
      upsert: true,
   });

   if (value.backgroundVideoId) {
      await Movie.updateMany(
         { backgroundVideoId: value.backgroundVideoId },
         { backgroundVideoUrl: value.backgroundVideoUrl }
      );
   }

   res.json(config);
});
