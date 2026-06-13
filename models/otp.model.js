import mongoose from "mongoose";

export const OTP_PURPOSES = ["email_verification", "password_reset"];

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      select: false,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    expireAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, purpose: 1 }, { unique: true });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
