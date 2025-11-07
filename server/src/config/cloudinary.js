import { v2 as cloudinary } from "cloudinary";
import env from "./env.js";

export const configureCloudinary = () => {
   const { cloudName, apiKey, apiSecret } = env.cloudinary;
   if (!cloudName || !apiKey || !apiSecret) {
      console.warn(
         "[cloudinary] Missing credentials; uploads will fail until configured."
      );
      return;
   }

   cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
   });
};

export default cloudinary;
