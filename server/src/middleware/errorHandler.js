import ApiError from "../utils/ApiError.js";

export const notFound = (_req, _res, next) => {
   next(new ApiError(404, "Resource not found."));
};

export const errorHandler = (err, _req, res, _next) => {
   const status = err.statusCode || err.status || 500;
   const payload = {
      message: err.message || "Internal server error.",
   };

   if (err.details) {
      payload.details = err.details;
   }

   if (process.env.NODE_ENV !== "production" && err.stack) {
      payload.stack = err.stack;
   }

   res.status(status).json(payload);
};

export default {
   notFound,
   errorHandler,
};
