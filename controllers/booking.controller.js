import { createBooking, getUserBookings } from "../services/booking.service.js";
import asyncHandler from "../utils/async-handler.js";

export const create = asyncHandler(async (req, res) => {
  const booking = await createBooking({
    userId: req.user.id,
    eventId: req.body.eventId,
    quantity: req.body.quantity,
  });

  res.status(201).json({
    success: true,
    message: "Booking created. Create a payment order to continue.",
    data: { booking },
  });
});

export const listMine = asyncHandler(async (req, res) => {
  const bookings = await getUserBookings(req.user.id);
  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    data: { bookings },
  });
});
