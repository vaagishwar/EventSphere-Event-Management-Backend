import { Router } from "express";

import {
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resetPassword,
  sendOtp,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateAuth } from "../middleware/validation.middleware.js";

const router = Router();

router.post("/register", validateAuth("register"), register);
router.post("/send-verification-otp", validateAuth("sendVerificationOtp"), sendOtp);
router.post("/verify-otp", validateAuth("verifyOtp"), verifyOtp);
router.post("/login", validateAuth("login"), login);
router.post("/forgot-password", validateAuth("forgotPassword"), forgotPassword);
router.post("/reset-password", validateAuth("resetPassword"), resetPassword);
router.get("/me", authenticate, getCurrentUser);

export default router;
