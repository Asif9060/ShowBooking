import { Router } from "express";
import {
   listMedia,
   uploadMedia,
   deleteMedia,
   assignMedia,
   upload,
} from "../controllers/mediaController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, listMedia);
router.post("/", requireAuth, requireAdmin, upload.single("file"), uploadMedia);
router.delete("/:id", requireAuth, requireAdmin, deleteMedia);
router.post("/:id/assign", requireAuth, requireAdmin, assignMedia);

export default router;
