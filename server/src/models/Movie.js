import mongoose from "../config/db.js";

const SeatLayoutSchema = new mongoose.Schema(
   {
      rows: { type: Number, default: 6, min: 1 },
      cols: { type: Number, default: 8, min: 1 },
   },
   { _id: false }
);

const MovieSchema = new mongoose.Schema(
   {
      title: { type: String, required: true, trim: true },
      runtime: { type: String, trim: true },
      rating: { type: String, trim: true },
      price: { type: Number, default: 0 },
      releaseYear: { type: Number },
      imdbRating: { type: Number },
      showtimes: { type: [String], default: [] },
      synopsis: { type: String, trim: true },
      genres: { type: [String], default: [] },
      cast: { type: [String], default: [] },
      director: { type: String, trim: true },
      producer: { type: String, trim: true },
      status: {
         type: String,
         enum: ["draft", "published", "archived"],
         default: "published",
      },
      posterUrl: { type: String, trim: true },
      posterPublicId: { type: String, trim: true },
      posterColor: { type: [String], default: undefined },
      multiplierFront: { type: Number, default: 1.5 },
      multiplierMiddle: { type: Number, default: 1.0 },
      multiplierBack: { type: Number, default: 0.75 },
      seatLayout: { type: SeatLayoutSchema, default: () => ({}) },
      backgroundVideoId: { type: String, trim: true },
      backgroundVideoUrl: { type: String, trim: true },
      isFeatured: { type: Boolean, default: false },
      featurePriority: { type: Number, default: 0 },
   },
   { timestamps: true }
);

MovieSchema.index({ title: 1 });
MovieSchema.index({ status: 1 });
MovieSchema.index({ isFeatured: 1, featurePriority: -1 });

export default mongoose.model("Movie", MovieSchema);
