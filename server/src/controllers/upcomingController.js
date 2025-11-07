import createError from "http-errors";
import Joi from "joi";
import UpcomingRelease from "../models/UpcomingRelease.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
   uploadBufferToCloudinary,
   deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

const upcomingSchema = Joi.object({
   title: Joi.string().trim().required(),
   releaseDate: Joi.date().allow(null),
   status: Joi.string().valid("draft", "published").default("draft"),
   summary: Joi.string().allow(""),
   posterUrl: Joi.string().uri().allow("", null),
   posterPublicId: Joi.string().allow("", null),
   posterColor: Joi.array().items(Joi.string()).optional(),
});

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

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
      // ignore JSON parse errors and fallback to CSV parsing
   }
   return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
};

const normalizeUpcomingPayload = (body = {}) => {
   const normalized = { ...body };

   if (hasOwn(normalized, "posterColor")) {
      normalized.posterColor = parseArrayField(normalized.posterColor);
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

const uploadPoster = async (file, existingPublicId) => {
   if (!file) return {};
   const result = await uploadBufferToCloudinary(file.buffer, {
      folder: "show-booking/upcoming-posters",
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

export const listUpcoming = asyncHandler(async (req, res) => {
   const filter = req.isAdmin ? {} : { status: "published" };
   const releases = await UpcomingRelease.find(filter).sort({ releaseDate: 1 });
   res.json(releases);
});

export const createUpcoming = asyncHandler(async (req, res, next) => {
   const payload = normalizeUpcomingPayload(req.body);
   const { error, value } = upcomingSchema.validate(payload, { abortEarly: false });
   if (error) {
      return next(
         createError(422, "Upcoming release validation failed.", {
            details: error.details,
         })
      );
   }

   const posterFields = req.file ? await uploadPoster(req.file) : {};
   const release = await UpcomingRelease.create({ ...value, ...posterFields });
   res.status(201).json(release);
});

export const updateUpcoming = asyncHandler(async (req, res, next) => {
   const release = await UpcomingRelease.findById(req.params.id);
   if (!release) {
      return next(createError(404, "Upcoming release not found."));
   }

   const payload = normalizeUpcomingPayload(req.body);
   const { error, value } = upcomingSchema.validate(payload, {
      abortEarly: false,
      allowUnknown: true,
   });
   if (error) {
      return next(
         createError(422, "Upcoming release validation failed.", {
            details: error.details,
         })
      );
   }

   const posterFields = req.file
      ? await uploadPoster(req.file, release.posterPublicId)
      : {};
   Object.assign(release, value, posterFields);
   await release.save();
   res.json(release);
});

export const deleteUpcoming = asyncHandler(async (req, res, next) => {
   const release = await UpcomingRelease.findById(req.params.id);
   if (!release) {
      return next(createError(404, "Upcoming release not found."));
   }
   await deleteFromCloudinary(release.posterPublicId);
   await release.deleteOne();
   res.status(204).send();
});
