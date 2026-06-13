import mongoose from "mongoose";

export const USER_ROLES = ["user", "organizer", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(document, returnedObject) {
        delete returnedObject.password;
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  },
);

const User = mongoose.model("User", userSchema);

export default User;
