import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ContactInquiry } from "../models/ContactInquiry";
import { sendMail, ADMIN_TO } from "../utils/mailer";

// Public: POST /public/contact  (create inquiry + send emails)
export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message } = req.body as { name?: string; email?: string; message?: string };
  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email and message are required." });
  }

  const doc = await ContactInquiry.create({ name, email, message });

  // fire-and-forget emails (don’t block user if SMTP fails)
  (async () => {
    try {
      // Email to admin
      await sendMail({
        to: ADMIN_TO,
        subject: `New contact inquiry from ${name}`,
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br/>")}</p>
          <p style="color:#888">Inquiry ID: ${doc._id}</p>
        `,
      });
      // Auto-reply to user
      await sendMail({
        to: email,
        subject: "We received your message — Aesthetic Clinic",
        html: `
          <p>Hi ${name.split(" ")[0]},</p>
          <p>Thanks for reaching out to Aesthetic Clinic. We’ve received your message and our team will get back to you shortly.</p>
          <hr/>
          <p><em>Your message:</em></p>
          <blockquote>${message.replace(/\n/g, "<br/>")}</blockquote>
          <p>Warm regards,<br/>Aesthetic Clinic</p>
        `,
      });
    } catch (e) {
      console.warn("[mailer] Failed to send contact emails:", e);
    }
  })();

  res.status(201).json({ message: "Thanks! We’ve received your message.", inquiry: { id: doc._id } });
});

// Admin: GET /admin/inquiries  (list, newest first)
export const listInquiries = asyncHandler(async (_req: Request, res: Response) => {
  const items = await ContactInquiry.find().sort({ createdAt: -1 }).lean();
  res.json({ inquiries: items });
});

// Admin: PATCH /admin/inquiries/:id/read  (toggle read)
export const markInquiryRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { read } = req.body as { read?: boolean };
  const doc = await ContactInquiry.findByIdAndUpdate(id, { read: !!read }, { new: true });
  if (!doc) return res.status(404).json({ message: "Inquiry not found" });
  res.json({ inquiry: doc });
});

// Admin: DELETE /admin/inquiries/:id
export const deleteInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await ContactInquiry.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ message: "Inquiry not found" });
  res.json({ message: "Inquiry deleted" });
});
