import { Router } from "express";

import { createOrder, paymentSuccess } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validateCreateOrder,
  validatePaymentSuccess,
} from "../middleware/business-validation.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, authorizeRoles("user"));
router.post("/create-order", validateCreateOrder, createOrder);
router.post("/success", validatePaymentSuccess, paymentSuccess);

export default router;
