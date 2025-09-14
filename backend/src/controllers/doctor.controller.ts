import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/User";
import { DoctorProfile } from "../models/DoctorProfile";
import { Appointment } from "../models/Appointment";
import { Report } from "../models/Report";

export const getDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const user = await User.findById(doctorId).select("name email role");
  if (!user || user.role !== "doctor") return res.status(404).json({ message: "Doctor not found" });

  const profile = await DoctorProfile.findOne({ user: doctorId });
  res.json({ user, profile });
});

export const upsertDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const { specialty, fee, availability } = req.body as {
    specialty?: string;
    fee?: number;
    availability?: { day: string; start: string; end: string }[];
  };

  await DoctorProfile.updateOne(
    { user: doctorId },
    { $set: { specialty, fee, availability } },
    { upsert: true }
  );
  const profile = await DoctorProfile.findOne({ user: doctorId });
  res.json({ message: "Profile saved", profile });
});

export const listMyAppointments = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const items = await Appointment.find({ doctor: doctorId })
    .populate("patient", "name email")
    .sort({ datetime: 1 });
  res.json({ appointments: items });
});

export const setAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const { id } = req.params;
  const { status } = req.body as { status: "confirmed" | "rejected" | "pending" };

  const appt = await Appointment.findOne({ _id: id, doctor: doctorId });
  if (!appt) return res.status(404).json({ message: "Appointment not found" });

  appt.status = status;
  await appt.save();
  res.json({ message: "Status updated", appointment: appt });
});

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const { patientId, title, notes, fileUrl } = req.body as {
    patientId: string; title: string; notes?: string; fileUrl?: string;
  };

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "doctor") return res.status(403).json({ message: "Forbidden" });

  const report = await Report.create({
    patient: patientId,
    doctor: doctorId,
    title,
    notes,
    fileUrl
  });

  res.status(201).json({ message: "Report created", report });
});

export const listReportsForMyPatients = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.sub;
  const reports = await Report.find({ doctor: doctorId })
    .populate("patient", "name email")
    .sort({ createdAt: -1 });
  res.json({ reports });
});
