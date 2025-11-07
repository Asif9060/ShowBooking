import { Router } from "express";
import {
   listUpcoming,
   createUpcoming,
   updateUpcoming,
   deleteUpcoming,
} from "../controllers/upcomingController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", listUpcoming);
router.post("/", requireAuth, requireAdmin, createUpcoming);
router.put("/:id", requireAuth, requireAdmin, updateUpcoming);
router.delete("/:id", requireAuth, requireAdmin, deleteUpcoming);

export default router;
