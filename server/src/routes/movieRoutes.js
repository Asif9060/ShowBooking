import { Router } from "express";
import {
   listMovies,
   listFeaturedMovies,
   getMovie,
   availabilityForShowtime,
} from "../controllers/movieController.js";

const router = Router();

router.get("/", listMovies);
router.get("/featured", listFeaturedMovies);
router.get("/:id", getMovie);
router.get("/:id/availability", availabilityForShowtime);

export default router;
