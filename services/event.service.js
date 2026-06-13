import mongoose from "mongoose";

import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import AppError from "../utils/app-error.js";

const ensureObjectId = (id, resource = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${resource} id`, 400);
  }
};

const ensureFutureDate = (eventDate) => {
  if (new Date(eventDate).getTime() <= Date.now()) {
    throw new AppError("Event date must be in the future", 400);
  }
};

export const createEvent = async (organizerId, data) => {
  ensureFutureDate(data.eventDate);

  return Event.create({
    ...data,
    availableSeats: data.totalSeats,
    organizerId,
    isApproved: false,
  });
};

export const updateOrganizerEvent = async (eventId, organizerId, data) => {
  ensureObjectId(eventId, "event");
  const event = await Event.findOne({ _id: eventId, organizerId });

  if (!event) {
    throw new AppError("Event not found or you do not own this event", 404);
  }

  if (data.eventDate !== undefined) {
    ensureFutureDate(data.eventDate);
  }

  const soldSeats = event.totalSeats - event.availableSeats;

  if (data.totalSeats !== undefined) {
    if (data.totalSeats < soldSeats) {
      throw new AppError(`Total seats cannot be lower than ${soldSeats} sold seats`, 400);
    }
    event.availableSeats = data.totalSeats - soldSeats;
  }

  const editableFields = [
    "title",
    "description",
    "venue",
    "eventDate",
    "totalSeats",
    "price",
    "banner",
  ];

  for (const field of editableFields) {
    if (data[field] !== undefined) {
      event[field] = data[field];
    }
  }

  event.isApproved = false;
  await event.save();
  return event;
};

export const deleteOrganizerEvent = async (eventId, organizerId) => {
  ensureObjectId(eventId, "event");
  const event = await Event.findOne({ _id: eventId, organizerId });

  if (!event) {
    throw new AppError("Event not found or you do not own this event", 404);
  }

  if (
    await Booking.exists({
      eventId,
      $or: [{ bookingStatus: "confirmed" }, { razorpayOrderId: { $ne: null } }],
    })
  ) {
    throw new AppError("Events with a payment order or confirmed booking cannot be deleted", 409);
  }

  await Booking.deleteMany({ eventId });
  await event.deleteOne();
};

export const listEventsForUser = async (user) => {
  let filter;

  if (user.role === "organizer") {
    filter = { organizerId: user.id };
  } else if (user.role === "admin") {
    filter = {};
  } else {
    filter = { isApproved: true };
  }

  return Event.find(filter).sort({ eventDate: 1 }).populate("organizerId", "name email");
};

export const getEventForUser = async (eventId, user) => {
  ensureObjectId(eventId, "event");
  const event = await Event.findById(eventId).populate("organizerId", "name email");

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  const organizerId = event.organizerId?._id?.toString() ?? event.organizerId.toString();
  const canView =
    user.role === "admin" ||
    (user.role === "organizer" && organizerId === user.id) ||
    (user.role === "user" && event.isApproved);

  if (!canView) {
    throw new AppError("Event not found", 404);
  }

  return event;
};

export const approveEvent = async (eventId) => {
  ensureObjectId(eventId, "event");
  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (event.eventDate.getTime() <= Date.now()) {
    throw new AppError("Past events cannot be approved", 400);
  }

  event.isApproved = true;
  await event.save();
  return event;
};
