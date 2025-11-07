import { Router } from "express";
import {
   getPublicConfig,
   getAdminConfig,
   updateConfig,
} from "../controllers/configController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getPublicConfig);
router.get("/admin", requireAuth, requireAdmin, getAdminConfig);
router.put("/admin", requireAuth, requireAdmin, updateConfig);

export default router;
