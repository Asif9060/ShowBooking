import mongoose from "../config/db.js";

const UpcomingReleaseSchema = new mongoose.Schema(
   {
      title: { type: String, required: true, trim: true },
      releaseDate: { type: Date },
      status: {
         type: String,
         enum: ["draft", "published"],
         default: "draft",
      },
      summary: { type: String, trim: true },
      posterUrl: { type: String, trim: true },
      posterPublicId: { type: String, trim: true },
      posterColor: { type: [String], default: undefined },
   },
   { timestamps: true }
);

UpcomingReleaseSchema.index({ title: 1 });
UpcomingReleaseSchema.index({ status: 1 });
UpcomingReleaseSchema.index({ releaseDate: 1 });

export default mongoose.model("UpcomingRelease", UpcomingReleaseSchema);
