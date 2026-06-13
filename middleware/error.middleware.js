import mongoose from "mongoose";

import env from "../config/env.js";
import AppError from "../utils/app-error.js";

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0] || "field";
    return new AppError(`${field} already exists`, 409);
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(
      "Validation failed",
      400,
      Object.values(error.errors).map((item) => item.message),
    );
  }
  if (error instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${error.path}`, 400);
  }
  if (error?.type === "entity.parse.failed") {
    return new AppError("Request body contains invalid JSON", 400);
  }
  return error;
};

export const errorHandler = (error, req, res, next) => {
  const normalizedError = normalizeError(error);
  const statusCode = normalizedError.statusCode || 500;
  const isProduction = env.nodeEnv === "production";

  if (statusCode >= 500) {
    console.error(normalizedError);
  }

  const response = {
    success: false,
    message:
      isProduction && statusCode === 500
        ? "An unexpected error occurred"
        : normalizedError.message || "Internal server error",
  };

  if (normalizedError.details) {
    response.details = normalizedError.details;
  }
  if (!isProduction && statusCode === 500) {
    response.stack = normalizedError.stack;
  }

  res.status(statusCode).json(response);
};
