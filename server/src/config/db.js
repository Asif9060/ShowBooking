import mongoose from "mongoose";
import env from "./env.js";

mongoose.set("strictQuery", true);

export const connectDatabase = async () => {
   if (!env.mongoUri) {
      throw new Error("Missing MongoDB connection string (MONGODB_URI).");
   }

   try {
      await mongoose.connect(env.mongoUri, {
         autoIndex: env.nodeEnv !== "production",
      });
      console.log("[database] Connected to MongoDB");
   } catch (error) {
      console.error("[database] MongoDB connection failed", error);
      throw error;
   }
};

export default mongoose;
