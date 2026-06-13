import {
  loginUser,
  requestPasswordReset,
  registerUser,
  resetUserPassword,
  sendVerificationOtp,
  verifyUserOtp,
} from "../services/auth.service.js";
import asyncHandler from "../utils/async-handler.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches jwtExpiresIn)
};


export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({
    success: true,
    message: "Registration successful. Check your email for the verification code.",
    data: { user },
  });
});

export const sendOtp = asyncHandler(async (req, res) => {
  await sendVerificationOtp(req.body.email);
  res.status(200).json({
    success: true,
    message: "Verification code sent successfully",
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const user = await verifyUserOtp(req.body.email, req.body.otp);
  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    data: { user },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await loginUser(req.body.email, req.body.password);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user, token },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    ...COOKIE_OPTIONS,
    maxAge: undefined,
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});


export const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email);
  res.status(200).json({
    success: true,
    message: "If an account exists for this email, a password reset code has been sent.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await resetUserPassword(req.body);
  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: { user: req.user },
  });
});
