import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/User";
import { DoctorProfile } from "../models/DoctorProfile";
import { Appointment, type AppointmentStatus } from "../models/Appointment";
import { Report } from "../models/Report";

const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function isInAvailability(date: Date, availability?: { day: string; start: string; end: string }[]) {
  if (!availability || availability.length === 0) return false;
  const day = DOW[date.getDay()];
  const time = date.toTimeString().slice(0, 5); // HH:MM
  return availability.some(s => s.day === day && s.start <= time && time < s.end);
}

// helpers for slot generation
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function hhmmLocal(date: Date): string {
  return date.toTimeString().slice(0,5);
}
function sameLocalDate(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** List doctors (+ basic profile) for patients to pick */
export const listDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await User.find({ role: "doctor" }).select("name email role createdAt");
  const profiles = await DoctorProfile.find({ user: { $in: doctors.map(d => d._id) } });
  const profileMap = new Map(profiles.map(p => [String(p.user), p]));
  const out = doctors.map(d => {
    const p = profileMap.get(String(d._id));
    return {
      _id: d._id,
      name: d.name,
      email: d.email,
      specialty: p?.specialty || "",
      fee: p?.fee ?? null,
      availability: p?.availability ?? [],
      maxPatientsPerDay: (p as any)?.maxPatientsPerDay ?? 20
    };
  });
  res.json({ doctors: out });
});

/** Patient’s appointments */
export const myAppointments = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const items = await Appointment.find({ patient: patientId })
    .populate("doctor", "name email")
    .sort({ datetime: 1 });
  res.json({ appointments: items });
});

/** Book new appointment */
export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const { doctorId, datetime, reason } = req.body as { doctorId: string; datetime: string; reason?: string };
  if (!doctorId || !datetime) return res.status(400).json({ message: "doctorId and datetime are required" });

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "doctor") return res.status(404).json({ message: "Doctor not found" });

  const profile = await DoctorProfile.findOne({ user: doctorId });
  const dt = new Date(datetime);
  if (isNaN(+dt)) return res.status(400).json({ message: "Invalid datetime" });

  // Validate availability
  if (!isInAvailability(dt, profile?.availability)) {
    return res.status(400).json({ message: "Selected time is outside doctor's availability" });
  }

  // Enforce max patients per day
  const maxPerDay = (profile as any)?.maxPatientsPerDay ?? 20;
  const startOfDay = new Date(dt); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(dt); endOfDay.setHours(23,59,59,999);

  const countForDay = await Appointment.countDocuments({
    doctor: doctorId,
    datetime: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["pending", "confirmed"] as AppointmentStatus[] }
  });
  if (countForDay >= maxPerDay) {
    return res.status(400).json({ message: "All slots for this day are fully booked. Please choose another day." });
  }

  // Prevent overlapping (±30min)
  const halfHour = 30 * 60 * 1000;
  const lower = new Date(+dt - halfHour);
  const upper = new Date(+dt + halfHour);
  const clash = await Appointment.findOne({
    doctor: doctorId,
    datetime: { $gte: lower, $lte: upper },
    status: { $in: ["pending","confirmed"] as AppointmentStatus[] }
  });
  if (clash) return res.status(409).json({ message: "Time slot not available" });

  const appt = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    datetime: dt,
    reason,
    status: "pending"
  });

  res.status(201).json({ message: "Appointment requested", appointment: appt });
});

/** Cancel appointment */
export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const { id } = req.params;
  const appt = await Appointment.findOne({ _id: id, patient: patientId });
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (appt.status === "confirmed") return res.status(400).json({ message: "Confirmed appointment cannot be cancelled here" });
  await appt.deleteOne();
  res.json({ message: "Appointment cancelled" });
});

/** Patient’s reports */
export const myReports = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const reports = await Report.find({ patient: patientId })
    .populate("doctor", "name email")
    .sort({ createdAt: -1 });
  res.json({ reports });
});

/** ✅ NEW: Get available slots for a doctor on a date */
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, date } = req.query as { doctorId?: string; date?: string };
  if (!doctorId || !date) {
    return res.status(400).json({ message: "doctorId and date are required" });
  }

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "doctor") return res.status(404).json({ message: "Doctor not found" });

  const profile = await DoctorProfile.findOne({ user: doctorId }).lean();
  const availability = profile?.availability || [];
  const maxPerDay = (profile as any)?.maxPatientsPerDay ?? 20;

  // Find relevant windows for this weekday
  const day = DOW[new Date(`${date}T00:00:00`).getDay()];
  const windows = availability.filter(s => s.day === day);
  if (!windows.length) return res.json({ slots: [] });

  // Generate slots in 30-min steps
  const slotMinutes = 30;
  let slots: string[] = [];
  for (const w of windows) {
    let cur = toMinutes(w.start);
    const end = toMinutes(w.end);
    while (cur + slotMinutes <= end) {
      slots.push(fromMinutes(cur));
      cur += slotMinutes;
    }
  }

  // Remove past times if today
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  if (sameLocalDate(today, target)) {
    const now = hhmmLocal(today);
    slots = slots.filter(s => s > now);
  }

  // Filter out booked
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T00:00:00`); dayEnd.setDate(dayEnd.getDate()+1);
  const booked = await Appointment.find({
    doctor: doctorId,
    datetime: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ["pending","confirmed"] }
  }).select("datetime");

  const bookedTimes = new Set(booked.map(b => hhmmLocal(new Date(b.datetime))));
  let free = slots.filter(s => !bookedTimes.has(s));

  // Enforce max per day
  if (booked.length >= maxPerDay) {
    free = [];
  } else if (free.length > maxPerDay - booked.length) {
    free = free.slice(0, maxPerDay - booked.length);
  }

  res.json({ slots: free });
});
