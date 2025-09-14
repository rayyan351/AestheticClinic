import { Router } from "express";
import auth from "./auth.routes";
import admin from "./admin.routes";
import doctor from "./doctor.routes";
import patient from "./patient.routes";
import publicRouter from "./public.routes"; 


const router = Router();

router.use("/auth", auth);
router.use("/admin", admin);
router.use("/doctor", doctor);
router.use("/patient", patient);
router.use("/public", publicRouter);

export default router;
