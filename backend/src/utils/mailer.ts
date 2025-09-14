import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,      // e.g. "Aesthetic Clinic <no-reply@yourclinic.com>"
  ADMIN_EMAIL,    // where admin receives contact notifications
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM || !ADMIN_EMAIL) {
  // Don’t crash app; just warn. (You can throw if you prefer strict.)
  console.warn("[mailer] Missing SMTP/MAIL env vars; email sending will be skipped.");
}

const transporter = (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  if (!transporter || !MAIL_FROM) return;
  await transporter.sendMail({ from: MAIL_FROM, ...opts });
}

export const ADMIN_TO = ADMIN_EMAIL!;
