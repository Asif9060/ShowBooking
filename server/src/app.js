import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import env from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { configureCloudinary } from "./config/cloudinary.js";
import authRoutes from "./routes/authRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import carouselRoutes from "./routes/carouselRoutes.js";
import upcomingRoutes from "./routes/upcomingRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

configureCloudinary();
await connectDatabase();

const app = express();

// Log configured client origins at startup for debugging CORS issues in production
console.log(`[config] Allowed client origins: ${env.clientOrigins.join(", ")}`);

app.use(helmet());
app.use(
   cors({
      origin: (origin, callback) => {
         // Allow requests with no origin (like mobile apps or curl requests)
         if (!origin) return callback(null, true);

         if (env.clientOrigins.includes(origin)) {
            callback(null, true);
         } else {
            console.log(`[CORS] Rejected origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
         }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
         "Content-Type",
         "Authorization",
         "Cookie",
         "X-Requested-With",
         "x-session-token",
      ],
      exposedHeaders: ["Set-Cookie"],
      maxAge: 86400, // 24 hours
   })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.accessLogFormat));

// Health check endpoint for UptimeRobot and monitoring services
app.get("/", (req, res) => {
   res.status(200).json({
      status: "ok",
      service: "Show Booking API",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
   });
});

app.get("/health", (req, res) => {
   res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
   });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/upcoming", upcomingRoutes);
app.use("/api/config", configRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
