import AppError from "../utils/app-error.js";

const EVENT_FIELDS = [
  "title",
  "description",
  "venue",
  "eventDate",
  "totalSeats",
  "price",
  "banner",
];
const REQUIRED_EVENT_FIELDS = [
  "title",
  "description",
  "venue",
  "eventDate",
  "totalSeats",
  "price",
];

const hasValue = (value) =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "");

const rejectUnknownFields = (body, allowedFields) => {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

  if (unknownFields.length > 0) {
    throw new AppError(`Unsupported fields: ${unknownFields.join(", ")}`, 400);
  }
};

const validateEventValues = (body) => {
  const stringFields = ["title", "description", "venue", "banner"];
  const invalidStrings = stringFields.filter(
    (field) => body[field] !== undefined && body[field] !== null && typeof body[field] !== "string",
  );

  if (invalidStrings.length > 0) {
    throw new AppError(`Fields must be strings: ${invalidStrings.join(", ")}`, 400);
  }
  if (body.totalSeats !== undefined && (!Number.isInteger(body.totalSeats) || body.totalSeats < 1)) {
    throw new AppError("totalSeats must be a positive integer", 400);
  }
  if (body.price !== undefined && (typeof body.price !== "number" || body.price < 1)) {
    throw new AppError("price must be at least 1 INR", 400);
  }
  if (body.eventDate !== undefined && Number.isNaN(Date.parse(body.eventDate))) {
    throw new AppError("eventDate must be a valid date", 400);
  }
};

export const validateCreateEvent = (req, res, next) => {
  try {
    rejectUnknownFields(req.body ?? {}, EVENT_FIELDS);
    const missingFields = REQUIRED_EVENT_FIELDS.filter((field) => !hasValue(req.body?.[field]));

    if (missingFields.length > 0) {
      throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    validateEventValues(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateUpdateEvent = (req, res, next) => {
  try {
    rejectUnknownFields(req.body ?? {}, EVENT_FIELDS);

    if (Object.keys(req.body ?? {}).length === 0) {
      throw new AppError("At least one event field is required", 400);
    }

    validateEventValues(req.body);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateCreateBooking = (req, res, next) => {
  try {
    rejectUnknownFields(req.body ?? {}, ["eventId", "quantity"]);

    if (!hasValue(req.body?.eventId) || !hasValue(req.body?.quantity)) {
      throw new AppError("eventId and quantity are required", 400);
    }
    if (typeof req.body.eventId !== "string") {
      throw new AppError("eventId must be a string", 400);
    }
    if (!Number.isInteger(req.body.quantity) || req.body.quantity < 1) {
      throw new AppError("quantity must be a positive integer", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateCreateOrder = (req, res, next) => {
  try {
    rejectUnknownFields(req.body ?? {}, ["bookingId"]);

    if (!hasValue(req.body?.bookingId) || typeof req.body.bookingId !== "string") {
      throw new AppError("bookingId is required and must be a string", 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const validatePaymentSuccess = (req, res, next) => {
  try {
    const fields = [
      "bookingId",
      "razorpay_order_id",
      "razorpay_payment_id",
      "razorpay_signature",
    ];
    rejectUnknownFields(req.body ?? {}, fields);
    const missingFields = fields.filter(
      (field) => !hasValue(req.body?.[field]) || typeof req.body[field] !== "string",
    );

    if (missingFields.length > 0) {
      throw new AppError(`Missing or invalid fields: ${missingFields.join(", ")}`, 400);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
