import mongoose from "mongoose";

import Booking from "../models/booking.model.js";
import Event from "../models/event.model.js";
import AppError from "../utils/app-error.js";

const ensureObjectId = (id, resource = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${resource} id`, 400);
  }
};

export const getOrganizerEventAnalytics = async ({
  eventId,
  organizerId,
  page = 1,
  limit = 10,
}) => {
  ensureObjectId(eventId, "event");

  const event = await Event.findOne({ _id: eventId, organizerId });

  if (!event) {
    throw new AppError("Event not found or you do not own this event", 404);
  }

  const eventObjectId = new mongoose.Types.ObjectId(eventId);
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  const [
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    revenueResult,
    recentBookings,
    recentBookingsTotal,
    trend,
  ] = await Promise.all([
    Booking.countDocuments({ eventId }),
    Booking.countDocuments({ eventId, bookingStatus: "confirmed" }),
    Booking.countDocuments({ eventId, bookingStatus: "pending" }),
    Booking.countDocuments({ eventId, bookingStatus: "cancelled" }),
    Booking.aggregate([
      {
        $match: {
          eventId: eventObjectId,
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]),
    Booking.find({ eventId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Booking.countDocuments({ eventId }),
    Booking.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          bookings: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookings: 1,
          revenue: 1,
        },
      },
    ]),
  ]);

  const revenue = revenueResult[0]?.totalRevenue ?? 0;
  const fillRate =
    event.totalSeats > 0
      ? Number((((event.totalSeats - event.availableSeats) / event.totalSeats) * 100).toFixed(2))
      : 0;

  return {
    event,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    availableSeats: event.availableSeats,
    revenue,
    fillRate,
    recentBookings,
    trend,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: recentBookingsTotal,
      totalPages: Math.max(Math.ceil(recentBookingsTotal / safeLimit), 1),
    },
  };
};
