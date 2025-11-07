import mongoose from "../config/db.js";

const SeatMultiplierSchema = new mongoose.Schema(
   {
      front: { type: Number, default: 1.5 },
      middle: { type: Number, default: 1.0 },
      back: { type: Number, default: 0.75 },
   },
   { _id: false }
);

const AppConfigSchema = new mongoose.Schema(
   {
      _id: { type: String, default: "singleton" },
      brandTitle: { type: String, default: "Movie and Show Booking" },
      tagline: { type: String, default: "Discover movies • Pick showtimes • Book seats" },
      supportEmail: { type: String, default: "support@example.com" },
      backgroundVideoId: { type: String },
      backgroundVideoUrl: { type: String },
      seatMultipliers: { type: SeatMultiplierSchema, default: () => ({}) },
   },
   { timestamps: true, versionKey: false }
);

export default mongoose.model("AppConfig", AppConfigSchema);
