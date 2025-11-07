import createError from "http-errors";
import cloudinary from "../config/cloudinary.js";

export const uploadBufferToCloudinary = (buffer, options = {}) => {
   if (!buffer || !buffer.length) {
      throw createError(400, "No upload buffer provided.");
   }

   if (!cloudinary?.uploader?.upload_stream) {
      throw createError(503, "Cloudinary uploader is not configured.");
   }

   const uploadOptions = {
      folder: "show-booking",
      resource_type: "auto",
      ...options,
   };

   return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
         if (error) {
            reject(error);
         } else {
            resolve(result);
         }
      });
      stream.end(buffer);
   });
};

export const deleteFromCloudinary = async (publicId) => {
   if (!publicId) return;
   if (!cloudinary?.uploader?.destroy) return;
   try {
      await cloudinary.uploader.destroy(publicId);
   } catch (error) {
      console.warn(`[cloudinary] Failed to delete asset ${publicId}:`, error.message);
   }
};

export default {
   uploadBufferToCloudinary,
   deleteFromCloudinary,
};
