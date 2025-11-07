import mongoose from "../config/db.js";

const SessionSchema = new mongoose.Schema(
   {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      tokenHash: { type: String, required: true, unique: true },
      expiresAt: { type: Date, required: true },
      userAgent: { type: String, maxlength: 512 },
   },
   { timestamps: true }
);

SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", SessionSchema);
