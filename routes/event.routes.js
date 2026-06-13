import { Router } from "express";

import {
  approve,
  create,
  details,
  list,
  remove,
  update,
} from "../controllers/event.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validateCreateEvent,
  validateUpdateEvent,
} from "../middleware/business-validation.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate);
router.post("/", authorizeRoles("organizer"), validateCreateEvent, create);
router.get("/", authorizeRoles("user", "organizer", "admin"), list);
router.patch("/:id/approve", authorizeRoles("admin"), approve);
router.get("/:id", authorizeRoles("user", "organizer", "admin"), details);
router.put("/:id", authorizeRoles("organizer"), validateUpdateEvent, update);
router.delete("/:id", authorizeRoles("organizer"), remove);

export default router;
