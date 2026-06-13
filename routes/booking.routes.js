import { Router } from "express";

import { create, listMine } from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateCreateBooking } from "../middleware/business-validation.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, authorizeRoles("user"));
router.post("/", validateCreateBooking, create);
router.get("/my", listMine);

export default router;
