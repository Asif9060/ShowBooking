import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { isAdminUser } from "../utils/authHelpers.js";

const hashSessionToken = (token) =>
   crypto.createHash("sha256").update(token).digest("hex");

export const requireAuth = async (req, _res, next) => {
   const tokenHeader = req.headers["x-session-token"];
   const sessionToken = Array.isArray(tokenHeader)
      ? tokenHeader[0]
      : typeof tokenHeader === "string"
      ? tokenHeader
      : "";

   if (!sessionToken?.trim()) {
      return next(new ApiError(401, "Authentication required."));
   }

   const tokenHash = hashSessionToken(sessionToken.trim());

   let session;
   try {
      session = await Session.findOne({ tokenHash }).populate("user");
   } catch (_error) {
      return next(new ApiError(401, "Invalid session."));
   }

   if (!session) {
      return next(new ApiError(401, "Session not found."));
   }

   if (session.expiresAt <= new Date()) {
      await session.deleteOne();
      return next(new ApiError(401, "Session expired."));
   }

   let userDoc = session.user;
   if (!userDoc) {
      userDoc = await User.findById(session.user).lean();
   }

   if (!userDoc) {
      await session.deleteOne();
      return next(new ApiError(401, "User not found for session."));
   }

   const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;

   req.session = session;
   req.sessionToken = sessionToken.trim();
   req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      displayName: user.displayName,
   };
   req.isAdmin = isAdminUser(req.user);
   return next();
};

export const requireAdmin = (req, _res, next) => {
   if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
   }
   if (!isAdminUser(req.user)) {
      return next(new ApiError(403, "Administrator privileges required."));
   }
   req.isAdmin = true;
   return next();
};
