import mongoose from "../config/db.js";

const UserSchema = new mongoose.Schema(
   {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      displayName: { type: String, trim: true },
      role: { type: String, enum: ["user", "admin"], default: "user" },
      lastLoginAt: { type: Date },
   },
   { timestamps: true }
);
export default mongoose.model("User", UserSchema);
