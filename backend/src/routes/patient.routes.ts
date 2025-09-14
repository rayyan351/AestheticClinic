import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  listDoctors, myAppointments, createAppointment, cancelAppointment, myReports,getAvailableSlots
} from "../controllers/patient.controller";

const router = Router();
router.use(requireAuth(["patient"]));

router.get("/doctors", listDoctors);
router.get("/appointments", myAppointments);
router.post("/appointments", createAppointment);
router.delete("/appointments/:id", cancelAppointment);
router.get("/reports", myReports);
router.get("/slots", getAvailableSlots);

export default router;
