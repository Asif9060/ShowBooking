import mongoose from "../config/db.js";

const CarouselSlideSchema = new mongoose.Schema(
   {
      title: { type: String, required: true, trim: true },
      subtitle: { type: String, trim: true },
      description: { type: String, trim: true },
      highlights: { type: [String], default: [] },
      ctaText: { type: String, trim: true },
      ctaUrl: { type: String, trim: true },
      movieId: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", default: undefined },
      status: { type: String, enum: ["draft", "published"], default: "draft" },
      priority: { type: Number, default: 0 },
      posterUrl: { type: String, trim: true },
      posterPublicId: { type: String, trim: true },
      posterColor: { type: [String], default: undefined },
   },
   { timestamps: true }
);

CarouselSlideSchema.index({ status: 1, priority: -1, updatedAt: -1 });

export default mongoose.model("CarouselSlide", CarouselSlideSchema);
