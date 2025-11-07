import createError from "http-errors";
import User from "../models/User.js";
import { isAdminUser } from "../utils/authHelpers.js";
import asyncHandler from "../utils/asyncHandler.js";

const toSafeUser = (user) => ({
   id: user._id.toString(),
   email: user.email,
   displayName: user.displayName,
   role: user.role,
   isAdmin: user.role === "admin",
   lastLoginAt: user.lastLoginAt,
   createdAt: user.createdAt,
   updatedAt: user.updatedAt,
});

export const getSession = asyncHandler(async (req, res) => {
   res.json({
      isAdmin: req.isAdmin === true,
      user: req.user ? { ...req.user } : null,
      session: req.session
         ? {
              expiresAt: req.session.expiresAt?.toISOString?.() || req.session.expiresAt,
           }
         : null,
   });
});

export const listUsers = asyncHandler(async (_req, res) => {
   const users = await User.find().sort({ createdAt: -1 });
   res.json(users.map(toSafeUser));
});

export const promoteUser = asyncHandler(async (req, res, next) => {
   const user = await User.findById(req.params.userId);
   if (!user) {
      return next(createError(404, "User not found."));
   }
   user.role = "admin";
   await user.save();
   res.status(204).send();
});

export const revokeUser = asyncHandler(async (req, res, next) => {
   const user = await User.findById(req.params.userId);
   if (!user) {
      return next(createError(404, "User not found."));
   }
   user.role = "user";
   await user.save();
   res.status(204).send();
});
