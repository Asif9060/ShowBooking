import createError from "http-errors";
import Joi from "joi";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";
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

const toBoolean = (value) => {
   if (typeof value === "boolean") return value;
   if (typeof value === "number") return value !== 0;
   if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return false;
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
   }
   return false;
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

const normalizeMoviePayload = (body = {}) => {
   const normalized = { ...body };

   if (hasOwn(normalized, "price")) {
      normalized.price = toNumber(normalized.price);
   }
   if (hasOwn(normalized, "releaseYear")) {
      normalized.releaseYear = toNumber(normalized.releaseYear);
   }
   if (hasOwn(normalized, "imdbRating")) {
      normalized.imdbRating = toNumber(normalized.imdbRating);
   }
   if (hasOwn(normalized, "multiplierFront")) {
      normalized.multiplierFront = toNumber(normalized.multiplierFront);
   }
   if (hasOwn(normalized, "multiplierMiddle")) {
      normalized.multiplierMiddle = toNumber(normalized.multiplierMiddle);
   }
   if (hasOwn(normalized, "multiplierBack")) {
      normalized.multiplierBack = toNumber(normalized.multiplierBack);
   }
   if (hasOwn(normalized, "featurePriority")) {
      const priority = toNumber(normalized.featurePriority);
      if (priority === undefined) {
         delete normalized.featurePriority;
      } else {
         normalized.featurePriority = priority;
      }
   }
   if (hasOwn(normalized, "isFeatured")) {
      normalized.isFeatured = toBoolean(normalized.isFeatured);
   }

   if (hasOwn(normalized, "showtimes")) {
      normalized.showtimes = parseArrayField(normalized.showtimes);
   }
   if (hasOwn(normalized, "genres")) {
      normalized.genres = parseArrayField(normalized.genres);
   }
   if (hasOwn(normalized, "cast")) {
      normalized.cast = parseArrayField(normalized.cast);
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

const DEFAULT_SEAT_LAYOUT = { rows: 6, cols: 8 };

const normalizeSeatLayout = (layout = {}) => {
   const parse = (value, fallback) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
   };
   return {
      rows: parse(layout.rows, DEFAULT_SEAT_LAYOUT.rows),
      cols: parse(layout.cols, DEFAULT_SEAT_LAYOUT.cols),
   };
};

const buildSeatCodesFromLayout = (layoutInput) => {
   const layout = normalizeSeatLayout(layoutInput);
   const codes = [];
   for (let row = 0; row < layout.rows; row += 1) {
      const rowLabel = String.fromCharCode(65 + row);
      for (let col = 1; col <= layout.cols; col += 1) {
         codes.push(`${rowLabel}${col}`);
      }
   }
   return { layout, codes };
};

const uploadPoster = async (file, existingPublicId) => {
   if (!file) return {};
   const result = await uploadBufferToCloudinary(file.buffer, {
      folder: "show-booking/movie-posters",
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

const movieSchema = Joi.object({
   title: Joi.string().trim().required(),
   runtime: Joi.string().allow(""),
   rating: Joi.string().allow(""),
   price: Joi.number().min(0).default(0),
   releaseYear: Joi.number().integer().min(1880).max(3000).allow(null),
   imdbRating: Joi.number().min(0).max(10).allow(null),
   showtimes: Joi.array().items(Joi.string()).default([]),
   synopsis: Joi.string().allow(""),
   genres: Joi.array().items(Joi.string()).default([]),
   cast: Joi.array().items(Joi.string()).default([]),
   director: Joi.string().allow(""),
   producer: Joi.string().allow(""),
   status: Joi.string().valid("draft", "published", "archived").default("published"),
   posterUrl: Joi.string().uri().allow("", null),
   posterPublicId: Joi.string().allow("", null),
   posterColor: Joi.array().items(Joi.string()).optional(),
   multiplierFront: Joi.number().min(0),
   multiplierMiddle: Joi.number().min(0),
   multiplierBack: Joi.number().min(0),
   isFeatured: Joi.boolean(),
   featurePriority: Joi.number().integer().min(-1000).max(1000),
   seatLayout: Joi.object({
      rows: Joi.number().integer().min(1).max(20).default(6),
      cols: Joi.number().integer().min(1).max(20).default(8),
   }).optional(),
   backgroundVideoId: Joi.string().allow(""),
   backgroundVideoUrl: Joi.string().uri().allow(""),
});

export const listMovies = asyncHandler(async (req, res) => {
   const filter = req.isAdmin ? {} : { status: { $ne: "archived" } };
   const movies = await Movie.find(filter).sort({ createdAt: -1 });
   res.json(movies);
});

export const listFeaturedMovies = asyncHandler(async (req, res) => {
   const limit = Math.max(1, Math.min(12, Number.parseInt(req.query.limit, 10) || 5));
   const baseFilter = req.isAdmin
      ? { status: { $ne: "archived" } }
      : { status: "published" };

   const featured = await Movie.find({ ...baseFilter, isFeatured: true })
      .sort({ featurePriority: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

   if (featured.length >= limit) {
      return res.json(featured);
   }

   const fallbackFilter = { ...baseFilter };
   const excludeIds = featured.map((movie) => movie._id);
   if (excludeIds.length) {
      fallbackFilter._id = { $nin: excludeIds };
   }

   const remaining = limit - featured.length;
   const fallback = await Movie.find(fallbackFilter)
      .sort({ releaseYear: -1, imdbRating: -1, createdAt: -1 })
      .limit(remaining)
      .lean();

   res.json([...featured, ...fallback]);
});

export const getMovie = asyncHandler(async (req, res, next) => {
   const movie = await Movie.findById(req.params.id);
   if (!movie) {
      return next(createError(404, "Movie not found."));
   }
   res.json(movie);
});

export const availabilityForShowtime = asyncHandler(async (req, res, next) => {
   const { id } = req.params;
   const { showtime } = req.query;

   if (!showtime) {
      return next(createError(400, "Showtime is required."));
   }

   const movie = await Movie.findById(id);
   if (!movie) {
      return next(createError(404, "Movie not found."));
   }

   const bookings = await Booking.find(
      { movie: id, showtime, status: "confirmed" },
      "seatCodes"
   ).lean();

   const bookedSet = new Set();
   bookings.forEach((booking) => {
      (booking.seatCodes || []).forEach((seat) => {
         if (typeof seat === "string") {
            bookedSet.add(seat);
         }
      });
   });

   const { layout, codes } = buildSeatCodesFromLayout(movie.seatLayout);
   const booked = Array.from(bookedSet).filter((seat) => codes.includes(seat));
   const available = codes.filter((seat) => !bookedSet.has(seat));

   res.json({
      layout,
      seats: {
         total: codes.length,
         available,
         booked,
      },
      booked,
   });
});

export const createMovie = asyncHandler(async (req, res, next) => {
   const payload = normalizeMoviePayload(req.body);
   const { error, value } = movieSchema.validate(payload, { abortEarly: false });
   if (error) {
      return next(
         createError(422, "Movie validation failed", { details: error.details })
      );
   }

   const posterFields = req.file ? await uploadPoster(req.file) : {};
   const movie = await Movie.create({ ...value, ...posterFields });
   res.status(201).json(movie);
});

export const updateMovie = asyncHandler(async (req, res, next) => {
   const movie = await Movie.findById(req.params.id);
   if (!movie) {
      return next(createError(404, "Movie not found."));
   }

   const payload = normalizeMoviePayload(req.body);
   const { error, value } = movieSchema.validate(payload, {
      abortEarly: false,
      allowUnknown: true,
   });
   if (error) {
      return next(
         createError(422, "Movie validation failed", { details: error.details })
      );
   }

   const posterFields = req.file
      ? await uploadPoster(req.file, movie.posterPublicId)
      : {};
   Object.assign(movie, value, posterFields);
   await movie.save();
   res.json(movie);
});

export const deleteMovie = asyncHandler(async (req, res, next) => {
   const movie = await Movie.findById(req.params.id);
   if (!movie) {
      return next(createError(404, "Movie not found."));
   }
   await deleteFromCloudinary(movie.posterPublicId);
   await movie.deleteOne();
   res.status(204).send();
});
