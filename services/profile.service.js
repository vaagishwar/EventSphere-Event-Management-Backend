import mongoose from "mongoose";

import User from "../models/user.model.js";
import AppError from "../utils/app-error.js";

const ensureObjectId = (id, resource = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${resource} id`, 400);
  }
};

export const updateProfile = async (userId, updateData) => {
  ensureObjectId(userId, "user");

  const allowedFields = ["name"];
  const updates = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
