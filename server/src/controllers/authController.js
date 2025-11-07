import bcrypt from "bcryptjs";
import crypto from "crypto";
import createError from "http-errors";
import Joi from "joi";
import Session from "../models/Session.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

const registerSchema = Joi.object({
   email: Joi.string().email().required(),
   password: Joi.string().min(8).required(),
   displayName: Joi.string().allow("", null),
});

const loginSchema = Joi.object({
   email: Joi.string().email().required(),
   password: Joi.string().required(),
});

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashSessionToken = (token) =>
   crypto.createHash("sha256").update(token).digest("hex");

const createSessionForUser = async (userId, userAgent = "") => {
   const rawToken = crypto.randomBytes(48).toString("hex");
   const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
   const tokenHash = hashSessionToken(rawToken);

   await Session.create({
      user: userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent?.slice(0, 512) || undefined,
   });

   return {
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
   };
};

const destroySessionByToken = async (token) => {
   if (!token) return;
   const tokenHash = hashSessionToken(token);
   await Session.deleteOne({ tokenHash });
};

const toSafeUser = (user) => ({
   id: user._id.toString(),
   email: user.email,
   role: user.role,
   displayName: user.displayName,
   createdAt: user.createdAt,
   updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (req, res, next) => {
   const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
   if (error) {
      return next(createError(422, "Registration failed.", { details: error.details }));
   }

   const existing = await User.findOne({ email: value.email });
   if (existing) {
      return next(createError(409, "An account with this email already exists."));
   }

   const passwordHash = await bcrypt.hash(value.password, 12);
   const user = await User.create({
      email: value.email,
      passwordHash,
      displayName: value.displayName,
      role: "user",
   });

   const session = await createSessionForUser(user._id, req.headers["user-agent"]);

   res.status(201).json({ user: toSafeUser(user), session });
});

export const login = asyncHandler(async (req, res, next) => {
   const { error, value } = loginSchema.validate(req.body);
   if (error) {
      return next(createError(422, "Invalid login request.", { details: error.details }));
   }

   const user = await User.findOne({ email: value.email });
   if (!user) {
      return next(createError(401, "Invalid email or password."));
   }

   const valid = await bcrypt.compare(value.password, user.passwordHash);
   if (!valid) {
      return next(createError(401, "Invalid email or password."));
   }

   user.lastLoginAt = new Date();
   await user.save();

   const session = await createSessionForUser(user._id, req.headers["user-agent"]);

   res.json({ user: toSafeUser(user), session });
});

export const profile = asyncHandler(async (req, res, next) => {
   if (!req.user?.id) {
      return next(createError(401, "Authentication required."));
   }
   const user = await User.findById(req.user.id);
   if (!user) {
      return next(createError(404, "User not found."));
   }
   res.json(toSafeUser(user));
});

export const logout = asyncHandler(async (req, res) => {
   const sessionToken = req.sessionToken;
   if (sessionToken) {
      await destroySessionByToken(sessionToken);
   }
   if (req.session?._id) {
      await Session.deleteOne({ _id: req.session._id });
   }
   res.status(204).send();
});
