import { Router } from "express";
import { User } from "../models/User";                 // adjust import if default export
import { DoctorProfile } from "../models/DoctorProfile"; // adjust import if default export
import { submitContact } from "../controllers/contact.controller";
import { ContactInquiry } from "../models/ContactInquiry"; // your model
import { sendMail } from "../utils/mailer";     

const router = Router();

/** Narrow, lean types for exactly what we read from Mongo */
type LeanUser = {
  _id: string;                 // ObjectId as string after JSON
  name?: string;
  email?: string;
  createdAt?: Date;
};

type LeanProfile = {
  doctor?: string;             // FK variant 1 (ObjectId -> string after lean+JSON)
  user?: string;               // FK variant 2
  specialty?: string;
  fee?: number;
  availability?: { day: string; start: string; end: string }[];
  experienceYears?: number;
  bio?: string;
};

/**
 * GET /api/public/doctors
 * Public listing of doctors (safe fields only)
 */
router.post("/contact", submitContact);
router.get("/doctors", async (_req, res) => {
  try {
    // 1) All users with role=doctor (public-safe fields only)
    const users = await User.find({ role: "doctor" })
      .select("_id name email createdAt")
      .lean<LeanUser[]>();

    if (!users.length) return res.json([]);

    const ids = users.map((u) => u._id);

    // 2) Try profiles keyed by `doctor`, then fallback to `user`
    let profiles = await DoctorProfile.find({ doctor: { $in: ids } })
      .select("doctor user specialty fee availability experienceYears bio")
      .lean<LeanProfile[]>();

    if (!profiles.length) {
      profiles = await DoctorProfile.find({ user: { $in: ids } })
        .select("doctor user specialty fee availability experienceYears bio")
        .lean<LeanProfile[]>();
    }

    // Build FK -> profile map (supports either `doctor` or `user`)
    const profileById = new Map<string, LeanProfile>();
    for (const p of profiles) {
      const key = String(p.doctor ?? p.user ?? "");
      if (key) profileById.set(key, p);
    }

    // 3) Merge and shape public response
    const doctors = users.map((u) => {
      const p = profileById.get(String(u._id));
      return {
        _id: u._id,
        name: u.name ?? "",
        email: u.email ?? "",
        profile: {
          specialty: p?.specialty ?? undefined,
          fee: p?.fee ?? undefined,
          availability: Array.isArray(p?.availability) ? p!.availability : [],
          experienceYears: p?.experienceYears ?? undefined,
          bio: p?.bio ?? undefined,
        },
        createdAt: u.createdAt ?? null, // keep if your frontend displays “joined”
      };
    });

    res.json(doctors);
  } catch (err) {
    console.error("Error fetching public doctors:", err);
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
});

router.post("/contact", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required." });
    }

    // Save to DB (so admin can see it)
    const inquiry = await ContactInquiry.create({ name, email, message });

    // Fire emails (best-effort; don't fail the request if mailer throws)
    try {
      // to admin
      await sendMail({
        to: process.env.ADMIN_EMAIL!,
        subject: `New inquiry from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      });
      // auto-reply to sender
      await sendMail({
        to: email,
        subject: "Thanks for contacting Aesthetic Clinic",
        text:
          `Hi ${name},\n\nThanks for reaching out — we’ve received your message and will reply shortly.\n\n` +
          `Your message:\n${message}\n\n` +
          `— Aesthetic Clinic`,
      });
    } catch (mailErr) {
      console.error("Inquiry emails failed:", mailErr);
      // continue; not critical for the API response
    }

    res.status(201).json({ ok: true, inquiry });
  } catch (err) {
    console.error("Create inquiry failed:", err);
    res.status(500).json({ message: "Failed to submit inquiry." });
  }
});

export default router;
