import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
    },
    totalSeats: {
      type: Number,
      required: [true, "Total seats are required"],
      min: [1, "Total seats must be at least 1"],
      validate: { validator: Number.isInteger, message: "Total seats must be an integer" },
    },
    availableSeats: {
      type: Number,
      required: [true, "Available seats are required"],
      min: [0, "Available seats cannot be negative"],
      validate: [
        { validator: Number.isInteger, message: "Available seats must be an integer" },
        {
          validator(value) {
            return this.totalSeats == null || value <= this.totalSeats;
          },
          message: "Available seats cannot exceed total seats",
        },
      ],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be at least 1 INR"],
    },
    banner: {
      type: String,
      trim: true,
      default: null,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
      index: true,
    },
  },
  { timestamps: true },
);

eventSchema.index({ organizerId: 1, eventDate: -1 });
eventSchema.index({ isApproved: 1, eventDate: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
