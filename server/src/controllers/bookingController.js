import createError from "http-errors";
import Joi from "joi";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";
import asyncHandler from "../utils/asyncHandler.js";

const seatSelectionSchema = Joi.array()
   .items(
      Joi.object({
         seat: Joi.string().required(),
         zone: Joi.string().valid("front", "middle", "back").default("middle"),
         price: Joi.number().min(0).required(),
      })
   )
   .min(1);

const paymentSchema = Joi.object({
   method: Joi.string().valid("card", "bkash").required(),
   cardHolder: Joi.string().max(120).allow("", null),
   cardNumber: Joi.string()
      .pattern(/^[0-9]{8,19}$/)
      .allow("", null),
   cardExpiry: Joi.string()
      .pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)
      .allow("", null),
   cardCvv: Joi.string()
      .pattern(/^[0-9]{3,4}$/)
      .allow("", null),
   bkashNumber: Joi.string()
      .pattern(/^[0-9]{5,15}$/)
      .allow("", null),
   bkashTransactionId: Joi.string().min(5).max(64).allow("", null),
})
   .custom((value, helpers) => {
      if (value.method === "card") {
         if (!value.cardHolder?.trim()) {
            return helpers.error("any.custom", {
               message: "Card holder name is required.",
            });
         }
         if (!value.cardNumber?.trim()) {
            return helpers.error("any.custom", { message: "Card number is required." });
         }
         if (!value.cardExpiry?.trim()) {
            return helpers.error("any.custom", { message: "Card expiry is required." });
         }
         if (!value.cardCvv?.trim()) {
            return helpers.error("any.custom", { message: "Card CVV is required." });
         }
      }

      if (value.method === "bkash") {
         if (!value.bkashTransactionId?.trim()) {
            return helpers.error("any.custom", {
               message: "bKash transaction ID is required.",
            });
         }
      }

      return value;
   })
   .prefs({ abortEarly: false });

   const adminBookingUpdateSchema = Joi.object({
      showtime: Joi.string().trim().allow(null, ""),
      totalPrice: Joi.number().min(0),
      status: Joi.string().valid("confirmed", "cancelled"),
      payment: Joi.object({
         method: Joi.string().valid("card", "bkash"),
         status: Joi.string().valid("pending", "authorized", "captured"),
         reference: Joi.string().allow(null, ""),
         cardHolder: Joi.string().allow(null, ""),
         cardLast4: Joi.string().allow(null, ""),
         bkashNumber: Joi.string().allow(null, ""),
         transactionId: Joi.string().allow(null, ""),
      }).min(1),
   })
      .min(1)
      .prefs({ abortEarly: false, stripUnknown: true });

export const createBooking = asyncHandler(async (req, res, next) => {
   if (!req.user?.id) {
      return next(createError(401, "Authentication required to book seats."));
   }

   const { movieId, showtime, seats, payment } = req.body;
   if (!movieId) {
      return next(createError(400, "movieId is required."));
   }
   if (!showtime) {
      return next(createError(400, "showtime is required."));
   }

   const { error, value } = seatSelectionSchema.validate(seats, { abortEarly: false });
   if (error) {
      return next(
         createError(422, "Seat selection invalid.", { details: error.details })
      );
   }

   // Payment is optional during booking creation
   let paymentValue = null;
   if (payment && typeof payment === "object") {
      const { error: paymentError, value: validatedPayment } =
         paymentSchema.validate(payment);
      if (paymentError) {
         return next(
            createError(422, "Payment details invalid.", {
               details: paymentError.details,
            })
         );
      }
      paymentValue = validatedPayment;
   }

   const movie = await Movie.findById(movieId);
   if (!movie) {
      return next(createError(404, "Movie not found."));
   }

   if (!movie.showtimes.includes(showtime)) {
      return next(createError(400, "Showtime not available for this movie."));
   }

   const seatCodes = value.map((item) => item.seat);

   const conflicting = await Booking.findOne({
      movie: movie._id,
      showtime,
      seatCodes: { $in: seatCodes },
      status: "confirmed",
   });

   if (conflicting) {
      return next(createError(409, "One or more seats already booked."));
   }

   const totalPrice = value.reduce((sum, seat) => sum + seat.price, 0);

   let paymentInfo;
   if (paymentValue) {
      if (paymentValue.method === "card") {
         const normalizedNumber = paymentValue.cardNumber.replace(/\s+/g, "");
         const last4 = normalizedNumber.slice(-4);
         paymentInfo = {
            method: "card",
            status: "authorized",
            reference: `CARD-${last4}`,
            cardLast4: last4,
            cardHolder: paymentValue.cardHolder?.trim() || undefined,
         };
      } else {
         paymentInfo = {
            method: "bkash",
            status: "pending",
            reference: paymentValue.bkashTransactionId?.trim(),
            bkashNumber: paymentValue.bkashNumber?.trim() || undefined,
            transactionId: paymentValue.bkashTransactionId?.trim(),
         };
      }
   } else {
      // Default pending payment if none provided
      paymentInfo = {
         method: "card",
         status: "pending",
      };
   }

   const booking = await Booking.create({
      user: req.user.id,
      movie: movie._id,
      movieId: movie._id.toString(),
      movieTitle: movie.title,
      showtime,
      seats: value,
      seatCodes,
      totalPrice,
      payment: paymentInfo,
      posterUrl: movie.posterUrl,
      posterColor: movie.posterColor,
   });

   res.status(201).json(booking);
});

export const updateBookingPayment = asyncHandler(async (req, res, next) => {
   if (!req.user?.id) {
      return next(createError(401, "Authentication required to update payment."));
   }

   const bookingId = req.params.bookingId;
   if (!bookingId) return next(createError(400, "bookingId is required."));

   const booking = await Booking.findById(bookingId);
   if (!booking) return next(createError(404, "Booking not found."));

   if (String(booking.user) !== String(req.user.id)) {
      return next(createError(403, "You are not allowed to update this booking."));
   }

   const { error: paymentError, value: paymentValue } = paymentSchema.validate(
      req.body || {}
   );
   if (paymentError) {
      return next(
         createError(422, "Payment details invalid.", { details: paymentError.details })
      );
   }

   // Normalize payment info similarly to createBooking
   let paymentInfo;
   if (paymentValue.method === "card") {
      const normalizedNumber = (paymentValue.cardNumber || "").replace(/\s+/g, "");
      const last4 = normalizedNumber.slice(-4);
      paymentInfo = {
         method: "card",
         status: "authorized",
         reference: `CARD-${last4}`,
         cardLast4: last4,
         cardHolder: paymentValue.cardHolder?.trim() || undefined,
      };
   } else {
      paymentInfo = {
         method: "bkash",
         status: "authorized",
         reference: paymentValue.bkashTransactionId?.trim(),
         bkashNumber: paymentValue.bkashNumber?.trim() || undefined,
         transactionId: paymentValue.bkashTransactionId?.trim(),
      };
   }

   booking.payment = paymentInfo;
   await booking.save();

   res.json(booking);
});

export const listBookings = asyncHandler(async (req, res, next) => {
   if (!req.user?.id) {
      return next(createError(401, "Authentication required."));
   }
   const bookings = await Booking.find({
      user: req.user.id,
      status: { $ne: "cancelled" },
   })
      .populate("movie", "title posterUrl posterColor")
      .sort({ createdAt: -1 });
   res.json(bookings);
});

export const deleteBooking = asyncHandler(async (req, res, next) => {
   if (!req.user?.id) {
      return next(createError(401, "Authentication required."));
   }
   const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user.id,
   });
   if (!booking) {
      return next(createError(404, "Booking not found."));
   }
   await booking.deleteOne();
   res.status(204).send();
});

export const adminListBookings = asyncHandler(async (_req, res) => {
   const bookings = await Booking.find()
      .populate("movie", "title")
      .populate("user", "email displayName role")
      .sort({ createdAt: -1 });
   res.json(bookings);
});

export const adminDeleteBooking = asyncHandler(async (req, res, next) => {
   const booking = await Booking.findById(req.params.bookingId);
   if (!booking) {
      return next(createError(404, "Booking not found."));
   }
   await booking.deleteOne();
   res.status(204).send();
});

export const adminMarkBookingPaid = asyncHandler(async (req, res, next) => {
   const booking = await Booking.findById(req.params.bookingId);
   if (!booking) {
      return next(createError(404, "Booking not found."));
   }

   const reference = req.body?.reference?.trim();
   const transactionId = req.body?.transactionId?.trim();
   const bkashNumber = req.body?.bkashNumber?.trim();

   const paymentSource = booking.payment;
   const payment =
      paymentSource && typeof paymentSource.toObject === "function"
         ? paymentSource.toObject()
         : { ...(paymentSource || {}) };
   payment.status = "captured";
   if (typeof payment.method !== "string") {
      payment.method = "bkash";
   }
   if (reference) payment.reference = reference;
   if (transactionId) payment.transactionId = transactionId;
   if (bkashNumber) payment.bkashNumber = bkashNumber;

   booking.payment = payment;
   booking.status = "confirmed";
   await booking.save();
   res.json(booking);
});

export const adminCancelBooking = asyncHandler(async (req, res, next) => {
   const booking = await Booking.findById(req.params.bookingId);
   if (!booking) {
      return next(createError(404, "Booking not found."));
   }

   booking.status = "cancelled";
   if (booking.payment) {
      if (typeof booking.payment.status === "string") {
         booking.payment.status = "pending";
      } else {
         booking.payment = {
            ...(typeof booking.payment.toObject === "function"
               ? booking.payment.toObject()
               : booking.payment),
            status: "pending",
         };
      }
   }
   await booking.save();
   res.json(booking);
});

export const adminUpdateBooking = asyncHandler(async (req, res, next) => {
   const bookingId = req.params.bookingId;
   if (!bookingId) {
      return next(createError(400, "bookingId is required."));
   }

   const { error, value } = adminBookingUpdateSchema.validate(req.body || {});
   if (error) {
      return next(
         createError(422, "Booking update invalid.", {
            details: error.details,
         })
      );
   }

   const booking = await Booking.findById(bookingId);
   if (!booking) {
      return next(createError(404, "Booking not found."));
   }

   if (Object.prototype.hasOwnProperty.call(value, "showtime")) {
      const showtime = value.showtime;
      if (showtime) {
         booking.showtime = showtime;
      }
   }

   if (Object.prototype.hasOwnProperty.call(value, "totalPrice") && value.totalPrice !== undefined) {
      booking.totalPrice = value.totalPrice;
   }

   if (value.status) {
      booking.status = value.status;
   }

   if (value.payment) {
      const paymentSource = booking.payment;
      const currentPayment =
         paymentSource && typeof paymentSource.toObject === "function"
            ? paymentSource.toObject()
            : { ...(paymentSource || {}) };
      booking.payment = {
         ...currentPayment,
         ...value.payment,
      };
   }

   await booking.save();
   res.json(booking);
});
