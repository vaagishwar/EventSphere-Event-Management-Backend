import {
  approveEvent,
  createEvent,
  deleteOrganizerEvent,
  getEventForUser,
  listEventsForUser,
  updateOrganizerEvent,
} from "../services/event.service.js";
import asyncHandler from "../utils/async-handler.js";

export const create = asyncHandler(async (req, res) => {
  const event = await createEvent(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Event created and submitted for approval",
    data: { event },
  });
});

export const update = asyncHandler(async (req, res) => {
  const event = await updateOrganizerEvent(req.params.id, req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Event updated and submitted for approval",
    data: { event },
  });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteOrganizerEvent(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});

export const list = asyncHandler(async (req, res) => {
  const events = await listEventsForUser(req.user);
  res.status(200).json({
    success: true,
    message: "Events retrieved successfully",
    data: { events },
  });
});

export const details = asyncHandler(async (req, res) => {
  const event = await getEventForUser(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: "Event retrieved successfully",
    data: { event },
  });
});

export const approve = asyncHandler(async (req, res) => {
  const event = await approveEvent(req.params.id);
  res.status(200).json({
    success: true,
    message: "Event approved successfully",
    data: { event },
  });
});
