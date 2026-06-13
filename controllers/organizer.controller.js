import { getOrganizerEventAnalytics } from "../services/organizer.service.js";
import asyncHandler from "../utils/async-handler.js";

export const eventAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getOrganizerEventAnalytics({
    eventId: req.params.eventId,
    organizerId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    message: "Organizer event analytics retrieved successfully",
    data: analytics,
  });
});
