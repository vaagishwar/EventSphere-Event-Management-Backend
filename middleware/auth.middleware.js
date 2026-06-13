import User from "../models/user.model.js";
import AppError from "../utils/app-error.js";
import asyncHandler from "../utils/async-handler.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Authentication token is required", 401);
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    throw new AppError("Authentication token is required", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Authentication token is invalid or expired", 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError("The user associated with this token no longer exists", 401);
  }

  req.user = user;
  next();
});
