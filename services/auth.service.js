import bcrypt from "bcrypt";

import env from "../config/env.js";
import OTP from "../models/otp.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/app-error.js";
import { signAccessToken } from "../utils/jwt.js";
import { generateOtp } from "../utils/otp.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";

const PUBLIC_ROLES = ["user", "organizer"];
const EMAIL_VERIFICATION = "email_verification";
const PASSWORD_RESET = "password_reset";
const normalizeEmail = (email) => email.trim().toLowerCase();

const createOtp = async ({ user, purpose, sendEmail }) => {
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, env.bcryptSaltRounds);
  const expireAt = new Date(Date.now() + env.otpExpiresInMinutes * 60 * 1000);

  await OTP.findOneAndUpdate(
    { userId: user.id, purpose },
    { otp: hashedOtp, expireAt },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  try {
    await sendEmail({
      name: user.name,
      email: user.email,
      otp,
      expiresInMinutes: env.otpExpiresInMinutes,
    });
  } catch (emailError) {
    console.error("Email sending failed:", emailError.message);
    // Don't throw - allow registration to proceed even if email fails
  }
};

const findAndValidateOtp = async ({ userId, otp, purpose }) => {
  const otpRecord = await OTP.findOne({ userId, purpose }).select("+otp");

  if (!otpRecord) {
    throw new AppError("Verification code is invalid or expired", 400);
  }
  if (otpRecord.expireAt.getTime() <= Date.now()) {
    await OTP.deleteOne({ _id: otpRecord.id });
    throw new AppError("Verification code has expired", 400);
  }
  if (!(await bcrypt.compare(String(otp), otpRecord.otp))) {
    throw new AppError("Invalid verification code", 400);
  }

  return otpRecord;
};

export const registerUser = async ({ name, email, password, role = "user" }) => {
  if (!PUBLIC_ROLES.includes(role)) {
    throw new AppError("Role must be either user or organizer", 400);
  }

  const normalizedEmail = normalizeEmail(email);

  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError("An account with this email already exists", 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, env.bcryptSaltRounds),
    role,
  });

  await createOtp({
    user,
    purpose: EMAIL_VERIFICATION,
    sendEmail: sendVerificationEmail,
  });
  return user;
};

export const sendVerificationOtp = async (email) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.isVerified) {
    throw new AppError("Email is already verified", 409);
  }

  await createOtp({
    user,
    purpose: EMAIL_VERIFICATION,
    sendEmail: sendVerificationEmail,
  });
};

export const verifyUserOtp = async (email, otp) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.isVerified) {
    throw new AppError("Email is already verified", 409);
  }

  await findAndValidateOtp({ userId: user.id, otp, purpose: EMAIL_VERIFICATION });

  user.isVerified = true;
  await user.save({ validateModifiedOnly: true });
  await OTP.deleteOne({ userId: user.id, purpose: EMAIL_VERIFICATION });
  return user;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.isVerified) {
    throw new AppError("Verify your email before logging in", 403);
  }

  return { user, token: signAccessToken(user) };
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    return;
  }

  await createOtp({
    user,
    purpose: PASSWORD_RESET,
    sendEmail: sendPasswordResetEmail,
  });
};

export const resetUserPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");

  if (!user) {
    throw new AppError("Verification code is invalid or expired", 400);
  }

  await findAndValidateOtp({ userId: user.id, otp, purpose: PASSWORD_RESET });

  user.password = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await user.save({ validateModifiedOnly: true });
  await OTP.deleteOne({ userId: user.id, purpose: PASSWORD_RESET });
};
