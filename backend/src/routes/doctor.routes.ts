import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getDoctorProfile, upsertDoctorProfile,
  listMyAppointments, setAppointmentStatus,
  createReport, listReportsForMyPatients
} from "../controllers/doctor.controller";

const router = Router();
router.use(requireAuth(["doctor"]));

router.get("/me", getDoctorProfile);
router.put("/me", upsertDoctorProfile);

router.get("/appointments", listMyAppointments);
router.patch("/appointments/:id/status", setAppointmentStatus);

router.post("/reports", createReport);
router.get("/reports", listReportsForMyPatients);

export default router;
