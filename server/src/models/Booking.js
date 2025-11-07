import mongoose from "../config/db.js";

const SeatSelectionSchema = new mongoose.Schema(
   {
      seat: { type: String, required: true, trim: true },
      zone: {
         type: String,
         enum: ["front", "middle", "back"],
         default: "middle",
      },
      price: { type: Number, required: true },
   },
   { _id: false }
);

const PaymentSchema = new mongoose.Schema(
   {
      method: {
         type: String,
         enum: ["card", "bkash"],
         required: true,
      },
      status: {
         type: String,
         enum: ["pending", "authorized", "captured"],
         default: "pending",
      },
      reference: { type: String },
      cardLast4: { type: String },
      cardHolder: { type: String },
      bkashNumber: { type: String },
      transactionId: { type: String },
   },
   { _id: false }
);

const BookingSchema = new mongoose.Schema(
   {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
      movieId: { type: String, required: true },
      movieTitle: { type: String, required: true },
      showtime: { type: String, required: true },
      seats: { type: [SeatSelectionSchema], validate: (value) => value.length > 0 },
      seatCodes: { type: [String], required: true },
      totalPrice: { type: Number, required: true },
      payment: { type: PaymentSchema, required: true },
      status: {
         type: String,
         enum: ["confirmed", "cancelled"],
         default: "confirmed",
      },
      posterUrl: { type: String },
      posterColor: { type: [String], default: undefined },
   },
   { timestamps: true }
);

BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ movie: 1, showtime: 1 });
BookingSchema.index({ "payment.reference": 1 });

export default mongoose.model("Booking", BookingSchema);
