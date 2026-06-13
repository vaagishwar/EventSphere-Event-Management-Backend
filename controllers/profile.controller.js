import { updateProfile } from "../services/profile.service.js";
import asyncHandler from "../utils/async-handler.js";

export const update = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});
