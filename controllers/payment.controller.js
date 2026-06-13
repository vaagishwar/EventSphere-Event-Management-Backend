import { confirmPayment, createPaymentOrder } from "../services/payment.service.js";
import asyncHandler from "../utils/async-handler.js";

export const createOrder = asyncHandler(async (req, res) => {
  const result = await createPaymentOrder({
    bookingId: req.body.bookingId,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Razorpay order created successfully",
    data: result,
  });
});

export const paymentSuccess = asyncHandler(async (req, res) => {
  const booking = await confirmPayment({
    bookingId: req.body.bookingId,
    user: req.user,
    razorpayOrderId: req.body.razorpay_order_id,
    razorpayPaymentId: req.body.razorpay_payment_id,
    razorpaySignature: req.body.razorpay_signature,
  });

  res.status(200).json({
    success: true,
    message: "Payment verified and booking confirmed",
    data: { booking },
  });
});
