import AppError from "../utils/app-error.js";

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication is required", 401));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  return next();
};
