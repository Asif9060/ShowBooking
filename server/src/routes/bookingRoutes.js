import { Router } from "express";
import {
   createBooking,
   listBookings,
   deleteBooking,
   updateBookingPayment,
} from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createBooking);
router.get("/", requireAuth, listBookings);
router.post("/:bookingId/payment", requireAuth, updateBookingPayment);
router.delete("/:bookingId", requireAuth, deleteBooking);

export default router;
