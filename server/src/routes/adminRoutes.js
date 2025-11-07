import { Router } from "express";
import {
   getSession,
   listUsers,
   promoteUser,
   revokeUser,
} from "../controllers/adminController.js";
import {
   listMovies,
   createMovie,
   updateMovie,
   deleteMovie,
} from "../controllers/movieController.js";
import {
   listUpcoming,
   createUpcoming,
   updateUpcoming,
   deleteUpcoming,
} from "../controllers/upcomingController.js";
import {
   listSlides as listCarouselSlides,
   createSlide as createCarouselSlide,
   updateSlide as updateCarouselSlide,
   deleteSlide as deleteCarouselSlide,
} from "../controllers/carouselController.js";
import {
   listMedia,
   uploadMedia,
   deleteMedia,
   assignMedia,
   upload,
} from "../controllers/mediaController.js";
import { getAdminConfig, updateConfig } from "../controllers/configController.js";
import {
   adminListBookings,
   adminDeleteBooking,
} from "../controllers/bookingController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/session", requireAuth, getSession);
router.get("/users", requireAuth, requireAdmin, listUsers);
router.post("/users/:userId/promote", requireAuth, requireAdmin, promoteUser);
router.post("/users/:userId/revoke", requireAuth, requireAdmin, revokeUser);

router.get("/movies", requireAuth, requireAdmin, listMovies);
router.post(
   "/movies",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   createMovie
);
router.put(
   "/movies/:id",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   updateMovie
);
router.delete("/movies/:id", requireAuth, requireAdmin, deleteMovie);

router.get("/upcoming", requireAuth, requireAdmin, listUpcoming);
router.post(
   "/upcoming",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   createUpcoming
);
router.put(
   "/upcoming/:id",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   updateUpcoming
);
router.delete("/upcoming/:id", requireAuth, requireAdmin, deleteUpcoming);

router.get("/carousel", requireAuth, requireAdmin, listCarouselSlides);
router.post(
   "/carousel",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   createCarouselSlide
);
router.put(
   "/carousel/:id",
   requireAuth,
   requireAdmin,
   upload.single("posterFile"),
   updateCarouselSlide
);
router.delete("/carousel/:id", requireAuth, requireAdmin, deleteCarouselSlide);

router.get("/media", requireAuth, requireAdmin, listMedia);
router.post("/media", requireAuth, requireAdmin, upload.single("file"), uploadMedia);
router.delete("/media/:id", requireAuth, requireAdmin, deleteMedia);
router.post("/media/:id/assign", requireAuth, requireAdmin, assignMedia);

router.get("/config", requireAuth, requireAdmin, getAdminConfig);
router.put("/config", requireAuth, requireAdmin, updateConfig);

router.get("/bookings", requireAuth, requireAdmin, adminListBookings);
router.delete("/bookings/:bookingId", requireAuth, requireAdmin, adminDeleteBooking);

export default router;
