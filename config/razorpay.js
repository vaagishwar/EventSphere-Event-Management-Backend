import Razorpay from "razorpay";

import { getRazorpayConfig } from "./env.js";

let razorpayClient;

export const getRazorpayClient = () => {
  if (!razorpayClient) {
    const razorpay = getRazorpayConfig();
    razorpayClient = new Razorpay({
      key_id: razorpay.keyId,
      key_secret: razorpay.keySecret,
    });
  }

  return razorpayClient;
};
