import { Router } from "express";
import { listPublishedSlides } from "../controllers/carouselController.js";

const router = Router();

router.get("/", listPublishedSlides);

export default router;
