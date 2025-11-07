import createError from "http-errors";
import Joi from "joi";
import mongoose from "mongoose";
import CarouselSlide from "../models/CarouselSlide.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
   uploadBufferToCloudinary,
   deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const toNumber = (value) => {
   if (value === undefined || value === null || value === "") return undefined;
   const num = Number(value);
   return Number.isFinite(num) ? num : undefined;
};

const parseArrayField = (value) => {
   if (Array.isArray(value)) return value;
   if (typeof value !== "string") return [];

   const trimmed = value.trim();
   if (!trimmed) return [];

   try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
         return parsed
            .map((item) => (typeof item === "string" ? item.trim() : String(item)))
            .filter(Boolean);
      }
   } catch (_error) {
      // Fallback to comma-delimited parsing
   }

   return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
};

const trimIfString = (value) => (typeof value === "string" ? value.trim() : value);

const normalizeCarouselPayload = (body = {}) => {
   const normalized = { ...body };

   ["title", "subtitle", "description", "ctaText", "ctaUrl"].forEach((field) => {
      if (hasOwn(normalized, field)) {
         normalized[field] = trimIfString(normalized[field]) ?? "";
      }
   });

   if (hasOwn(normalized, "highlights")) {
      normalized.highlights = parseArrayField(normalized.highlights);
   }

   if (hasOwn(normalized, "posterColor")) {
      const colors = parseArrayField(normalized.posterColor);
      normalized.posterColor = colors;
   }

   if (hasOwn(normalized, "priority")) {
      const priority = toNumber(normalized.priority);
      normalized.priority = priority ?? 0;
   }

   if (hasOwn(normalized, "ctaUrl") && !normalized.ctaUrl) {
      delete normalized.ctaUrl;
   }

   if (hasOwn(normalized, "movieId")) {
      const trimmed = trimIfString(normalized.movieId);
      normalized.movieId = trimmed || undefined;
   }

   if (typeof normalized.posterUrl === "string" && !normalized.posterUrl.trim()) {
      delete normalized.posterUrl;
   }
   if (
      typeof normalized.posterPublicId === "string" &&
      !normalized.posterPublicId.trim()
   ) {
      delete normalized.posterPublicId;
   }

   return normalized;
};

const carouselSchema = Joi.object({
   title: Joi.string().trim().required(),
   subtitle: Joi.string().allow(""),
   description: Joi.string().allow(""),
   highlights: Joi.array().items(Joi.string()),
   ctaText: Joi.string().allow(""),
   ctaUrl: Joi.string().uri().allow("", null),
   movieId: Joi.string().length(24).hex().allow(null, ""),
   status: Joi.string().valid("draft", "published"),
   priority: Joi.number().integer().min(-1000).max(1000),
   posterUrl: Joi.string().uri().allow("", null),
   posterPublicId: Joi.string().allow("", null),
   posterColor: Joi.array().items(Joi.string()).optional(),
});

const uploadPoster = async (file, existingPublicId) => {
   if (!file) return {};
   const result = await uploadBufferToCloudinary(file.buffer, {
      folder: "show-booking/carousel",
      resource_type: "image",
   });

   if (existingPublicId && existingPublicId !== result.public_id) {
      await deleteFromCloudinary(existingPublicId);
   }

   return {
      posterUrl: result.secure_url || result.url,
      posterPublicId: result.public_id,
   };
};

const ensureMovieId = (value) => {
   if (!value) return undefined;
   if (!mongoose.Types.ObjectId.isValid(value)) {
      throw createError(422, "Invalid movie reference supplied for carousel slide.");
   }
   return new mongoose.Types.ObjectId(value);
};

export const listPublishedSlides = asyncHandler(async (_req, res) => {
   const slides = await CarouselSlide.find({ status: "published" })
      .sort({ priority: -1, updatedAt: -1 })
      .lean();
   res.json(slides);
});

export const listSlides = asyncHandler(async (_req, res) => {
   const slides = await CarouselSlide.find().sort({ priority: -1, updatedAt: -1 });
   res.json(slides);
});

export const createSlide = asyncHandler(async (req, res, next) => {
   const payload = normalizeCarouselPayload(req.body);
   const { error, value } = carouselSchema.validate(payload, { abortEarly: false });
   if (error) {
      return next(
         createError(422, "Carousel slide validation failed.", {
            details: error.details,
         })
      );
   }

   if (value.movieId) {
      try {
         value.movieId = ensureMovieId(value.movieId);
      } catch (validationError) {
         return next(validationError);
      }
   } else {
      delete value.movieId;
   }

   if (!value.ctaText) delete value.ctaText;
   if (!value.ctaUrl) delete value.ctaUrl;

   const posterFields = req.file ? await uploadPoster(req.file) : {};
   const slide = await CarouselSlide.create({ ...value, ...posterFields });
   res.status(201).json(slide);
});

export const updateSlide = asyncHandler(async (req, res, next) => {
   const slide = await CarouselSlide.findById(req.params.id);
   if (!slide) {
      return next(createError(404, "Carousel slide not found."));
   }

   const payload = normalizeCarouselPayload(req.body);
   const { error, value } = carouselSchema.validate(payload, {
      abortEarly: false,
      allowUnknown: true,
   });
   if (error) {
      return next(
         createError(422, "Carousel slide validation failed.", {
            details: error.details,
         })
      );
   }

   if (value.movieId) {
      try {
         value.movieId = ensureMovieId(value.movieId);
      } catch (validationError) {
         return next(validationError);
      }
   } else {
      value.movieId = undefined;
   }

   if (!value.ctaUrl) delete value.ctaUrl;
   if (!value.ctaText) delete value.ctaText;

   const posterFields = req.file
      ? await uploadPoster(req.file, slide.posterPublicId)
      : {};

   const updates = { ...value, ...posterFields };
   if (updates.movieId === undefined) {
      slide.set("movieId", undefined);
      delete updates.movieId;
   }

   slide.set(updates);
   await slide.save();
   res.json(slide);
});

export const deleteSlide = asyncHandler(async (req, res, next) => {
   const slide = await CarouselSlide.findById(req.params.id);
   if (!slide) {
      return next(createError(404, "Carousel slide not found."));
   }

   await deleteFromCloudinary(slide.posterPublicId);
   await slide.deleteOne();
   res.status(204).send();
});
