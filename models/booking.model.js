import mongoose from "mongoose";

export const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "refunded"];
export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required"],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: { validator: Number.isInteger, message: "Quantity must be an integer" },
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
    },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ eventId: 1, bookingStatus: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
