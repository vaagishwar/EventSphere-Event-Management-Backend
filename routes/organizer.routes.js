import { Router } from "express";

import { eventAnalytics } from "../controllers/organizer.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, authorizeRoles("organizer"));
router.get("/events/:eventId/analytics", eventAnalytics);

export default router;
