import AppError from "../utils/app-error.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

const AUTH_SCHEMAS = {
  register: {
    required: ["name", "email", "password"],
    strings: ["name", "email", "password", "role"],
    email: true,
    passwordField: "password",
  },
  verifyOtp: {
    required: ["email", "otp"],
    strings: ["email"],
    email: true,
    otp: true,
  },
  login: {
    required: ["email", "password"],
    strings: ["email", "password"],
    email: true,
  },
  forgotPassword: {
    required: ["email"],
    strings: ["email"],
    email: true,
  },
  resetPassword: {
    required: ["email", "otp", "newPassword"],
    strings: ["email", "newPassword"],
    email: true,
    otp: true,
    passwordField: "newPassword",
  },
  sendVerificationOtp: {
    required: ["email"],
    strings: ["email"],
    email: true,
  },
};

export const validateAuth = (schemaName) => (req, res, next) => {
  const schema = AUTH_SCHEMAS[schemaName];

  if (!schema) {
    return next(new AppError("Authentication validation schema is not configured", 500));
  }

  const body = req.body ?? {};
  const missingFields = schema.required.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missingFields.length > 0) {
    return next(new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400));
  }

  const invalidStringFields = schema.strings.filter(
    (field) => body[field] !== undefined && typeof body[field] !== "string",
  );

  if (invalidStringFields.length > 0) {
    return next(new AppError(`Fields must be strings: ${invalidStringFields.join(", ")}`, 400));
  }

  if (schema.email && !EMAIL_PATTERN.test(body.email)) {
    return next(new AppError("Enter a valid email address", 400));
  }

  if (schema.otp && !OTP_PATTERN.test(String(body.otp))) {
    return next(new AppError("Verification code must contain 6 digits", 400));
  }

  if (schema.passwordField && body[schema.passwordField].length < 8) {
    return next(new AppError("Password must contain at least 8 characters", 400));
  }

  return next();
};
