import mongoose from "mongoose";

import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import AppError from "../utils/app-error.js";

const ensureObjectId = (id, resource = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${resource} id`, 400);
  }
};

export const createBooking = async ({ userId, eventId, quantity }) => {
  ensureObjectId(eventId, "event");
  const event = await Event.findOne({
    _id: eventId,
    isApproved: true,
    eventDate: { $gt: new Date() },
  });

  if (!event) {
    throw new AppError("Approved upcoming event not found", 404);
  }
  if (event.availableSeats < quantity) {
    throw new AppError("Not enough seats are available", 409);
  }

  const existingBooking = await Booking.findOne({
    userId,
    eventId,
    bookingStatus: { $ne: "cancelled" },
  });

  if (existingBooking) {
    throw new AppError("You already have a booking for this event", 409);
  }

  return Booking.create({
    userId,
    eventId: event.id,
    quantity,
    amount: event.price * quantity,
  });
};

export const getUserBookings = async (userId) =>
  Booking.find({ userId })
    .sort({ createdAt: -1 })
    .populate("eventId", "title venue eventDate banner price");
