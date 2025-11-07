import "dotenv/config";

const requiredKeys = [
   "PORT",
   "MONGODB_URI",
   "CLOUDINARY_CLOUD_NAME",
   "CLOUDINARY_API_KEY",
   "CLOUDINARY_API_SECRET",
];

const parseOrigins = (value = "") =>
   value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

const defaultOrigins = ["http://localhost:5500", "http://127.0.0.1:5500"];
const configuredOrigins = parseOrigins(process.env.CLIENT_ORIGIN);
const clientOrigins = configuredOrigins.length ? configuredOrigins : defaultOrigins;

const env = {
   nodeEnv: process.env.NODE_ENV || "development",
   port: parseInt(process.env.PORT, 10) || 4000,
   clientOrigin: clientOrigins[0],
   clientOrigins,
   mongoUri: process.env.MONGODB_URI,
   cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
   },
   accessLogFormat: process.env.ACCESS_LOG_FORMAT || "dev",
};

for (const key of requiredKeys) {
   if (!process.env[key]) {
      console.warn(`[config] Missing environment variable: ${key}`);
   }
}

export default env;
