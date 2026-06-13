import { createHmac, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";

import { getRazorpayClient } from "../config/razorpay.js";
import { getRazorpayConfig } from "../config/env.js";
import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import AppError from "../utils/app-error.js";
import { sendBookingConfirmationEmail } from "./email.service.js";

const ensureObjectId = (id, resource = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${resource} id`, 400);
  }
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getRazorpayConfig();
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(signature, "utf8");

  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const createPaymentOrder = async ({ bookingId, userId }, dependencies = {}) => {
  ensureObjectId(bookingId, "booking");
  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  if (booking.paymentStatus === "paid") {
    throw new AppError("Booking is already paid", 409);
  }

  const event = await Event.findById(booking.eventId);
  if (!event || !event.isApproved || event.eventDate.getTime() <= Date.now()) {
    throw new AppError("This event is no longer available for payment", 409);
  }
  if (event.availableSeats < booking.quantity) {
    throw new AppError("Not enough seats are available", 409);
  }

  const razorpayClient = dependencies.razorpayClient ?? getRazorpayClient();
  const order = await razorpayClient.orders.create({
    amount: Math.round(booking.amount * 100),
    currency: "INR",
    receipt: `booking_${booking.id}`,
    notes: { bookingId: booking.id, userId: String(userId) },
  });

  booking.razorpayOrderId = order.id;
  await booking.save({ validateModifiedOnly: true });

  return {
    booking,
    keyId: dependencies.keyId ?? getRazorpayConfig().keyId,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    },
  };
};

export const confirmPayment = async ({
  bookingId,
  user,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}, dependencies = {}) => {
  ensureObjectId(bookingId, "booking");
  const booking = await Booking.findOne({ _id: bookingId, userId: user.id });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  if (
    booking.paymentStatus === "paid" &&
    booking.paymentId === razorpayPaymentId &&
    booking.razorpayOrderId === razorpayOrderId
  ) {
    return booking.populate("eventId", "title venue eventDate");
  }
  if (booking.paymentStatus !== "pending" || booking.razorpayOrderId !== razorpayOrderId) {
    throw new AppError("Booking is not awaiting this payment", 409);
  }
  if (
    !verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
  ) {
    throw new AppError("Invalid payment signature", 400);
  }

  const claimedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking.id,
      userId: user.id,
      paymentStatus: "pending",
      razorpayOrderId,
    },
    { paymentStatus: "processing", paymentId: razorpayPaymentId },
    { new: true },
  );

  if (!claimedBooking) {
    throw new AppError("Payment is already being processed", 409);
  }

  const event = await Event.findOneAndUpdate(
    {
      _id: claimedBooking.eventId,
      isApproved: true,
      availableSeats: { $gte: claimedBooking.quantity },
    },
    { $inc: { availableSeats: -claimedBooking.quantity } },
    { new: true },
  );

  if (!event) {
    await Booking.updateOne(
      { _id: claimedBooking.id, paymentStatus: "processing" },
      { paymentStatus: "pending", paymentId: null },
    );
    throw new AppError("Not enough seats are available", 409);
  }

  claimedBooking.paymentStatus = "paid";
  claimedBooking.bookingStatus = "confirmed";
  await claimedBooking.save({ validateModifiedOnly: true });

  const confirmedBooking = await claimedBooking.populate("eventId", "title venue eventDate");
  const sendConfirmation = dependencies.sendConfirmation ?? sendBookingConfirmationEmail;

  try {
    await sendConfirmation({
      name: user.name,
      email: user.email,
      booking: confirmedBooking,
    });
  } catch (error) {
    console.error("Booking confirmed, but the confirmation email could not be sent:", error.message);
  }

  return confirmedBooking;
};
