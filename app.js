import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import env from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import eventRoutes from "./routes/event.routes.js";
import organizerRoutes from "./routes/organizer.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import AppError from "./utils/app-error.js";

const app = express();

app.disable("x-powered-by");
app.use(cookieParser(env.jwtSecret));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError("Origin is not allowed by CORS", 403));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "EventSphere API is healthy",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/organizer", organizerRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
