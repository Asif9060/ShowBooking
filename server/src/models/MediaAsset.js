import mongoose from "../config/db.js";

const MediaAssetSchema = new mongoose.Schema(
   {
      type: {
         type: String,
         enum: ["poster", "gallery", "backgroundVideo", "document", "other"],
         required: true,
      },
      movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
      movieId: { type: String, trim: true },
      visibility: {
         type: String,
         enum: ["public", "private"],
         default: "public",
      },
      publicId: { type: String },
      url: { type: String },
      secureUrl: { type: String },
      format: { type: String },
      bytes: { type: Number },
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
      folder: { type: String },
      metadata: { type: Map, of: String },
   },
   { timestamps: true }
);

MediaAssetSchema.index({ type: 1, createdAt: -1 });
MediaAssetSchema.index({ movie: 1, type: 1 });

export default mongoose.model("MediaAsset", MediaAssetSchema);
