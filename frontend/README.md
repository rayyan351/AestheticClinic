Aesthetic Clinic — Full-Stack App

A modern, dark-themed clinic platform with patients, doctors, and admin roles. Patients can discover doctors and book within real availability windows; doctors manage profiles; admins manage users and see contact inquiries. Responsive UI, tasteful motion, and a premium aesthetic.

✨ Features
Public site

Hero + Navbar: luxury dark theme, glassy navbar, smooth reveal animations.

Our Doctors: shows up to 3 doctors (from DB) on the landing page; “See all” opens the full doctor directory.

Doctor modal on landing cards with deep link:

If you’re a patient and logged in → goes straight to patient booking with that doctor preselected.

Otherwise → redirects to patient login with ?next=/patient?doctorId=....

Contact form: creates an inbox item for Admin and sends two emails (to clinic & auto-reply to the sender).

Patients

Dashboard tabs: Book • My Appointments • My Reports.

Smart booking:

Slots restricted to the doctor’s published availability (30-min steps).

Server enforces max patients per day (default 20, customizable per doctor).

Prevents overlapping bookings (±30 minutes) and time-in-past.

My Appointments: status badges (pending/confirmed) + cancel (if not confirmed).

Reports: lists files the doctor added (with links).

Admin

Stats: total users / doctors / patients / admins.

Manage doctors: create, edit (name/email/password/specialty/fee), delete, CSV export, search, sort, date-range filter.

Patients: list, search, filters, export, delete.

All Users: read-only snapshot.

Inquiries (from Contact): read/unread flag, delete; shows name, email, message, created time.

Doctors

Profile model includes specialty, fee, availability (day/start/end), and maxPatientsPerDay.

🧱 Tech Stack

Frontend: React + TypeScript, Vite, CSS modules (hand-crafted styles).

Backend: Node.js, Express, TypeScript.

Database: MongoDB + Mongoose.

Auth: session/cookie based (via backend /auth/*), role in JWT/session.

Mail: Nodemailer (SMTP or provider).

Build/Dev: npm scripts; optional GitHub Actions for CI.

📁 Folder Structure (typical)
.
├─ src/
│  ├─ client/ (React app)  ← if you keep FE separate, otherwise it’s in src/pages etc.
│  ├─ pages/               ← Patient/Admin/Doctor/Public pages (React)
│  ├─ components/          ← Navbar, cards, modals
│  ├─ styles/              ← CSS files (navbar.css, landing.css, etc.)
│  ├─ lib/                 ← api.ts (axios), adminApi.ts, patientApi.ts, publicApi.ts
│  ├─ state/               ← AuthContext
│  ├─ server/              ← Express app (if separated); otherwise:
│  ├─ models/              ← User, DoctorProfile, Appointment, Report, Inquiry
│  ├─ controllers/         ← patient.controller.ts, admin.controller.ts, public.controller.ts
│  ├─ routes/              ← /public, /patient, /admin, /auth
│  └─ utils/               ← asyncHandler, email, etc.
├─ .env.example
├─ README.md
└─ package.json


Your exact layout may differ slightly; this doc focuses on what exists and how to run it.

🔐 Environment Variables

Create a .env at the project root by copying .env.example. Do not commit real secrets—commit only .env.example.

# .env.example
# --- Server ---
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/aesthetic_clinic

SESSION_SECRET=replace_me_with_long_random_string

# SMTP for emails (Nodemailer)
SMTP_HOST=smtp.yourhost.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM="Aesthetic Clinic <no-reply@yourdomain.com>"
MAIL_TO_ADMIN=owner@yourdomain.com   # where contact inquiries are emailed

# CORS / Frontend
CLIENT_URL=http://localhost:5173

# (Optional) DEPLOY URLs
PUBLIC_URL=https://your-frontend.app
API_URL=https://your-api.app

👩‍⚕️ Demo Accounts

Update these with real (non-sensitive) demo creds before sharing the repo.

Admin
- email: rayyan@admin.clinic
- password: Rayyan123@

Doctor
- email: drshahid1@clinic.com
- password: Shahid123@

- email: dramir1@clinic.com
- password: Amir123@

Patient
- email: rayyan@patient.com
- password: Patient123@


You can seed them manually (Mongo shell), via an admin creation route, or add a small seed script.

▶️ Local Development
1) Install
npm install

2) Configure env

Copy .env.example → .env

Put your local Mongo URI and SMTP creds.

3) Run dev servers

Backend (Express) often on :5000

Frontend (Vite) on :5173

# terminal A
npm run dev:server

# terminal B
npm run dev:client


Or if you wired a single command: npm run dev (using concurrently).

4) Open

Frontend: http://localhost:5173

API: http://localhost:5000/api

🧭 UI Guide
Navbar

Glass / blurred backdrop, luxury gold accents (no blues).

Shows Home, and depending on auth:

Logged out: Login / Signup

Logged in: Dashboard + Logout

Current route gets an animated underline.

Landing (Hero)

Large headline (“Precision skincare, elevated.”).

Subtle orbs/glow behind the hero image area.

CTA buttons (Book • Explore).

Our Doctors (landing)

Max 3 cards (for taste). Hover overlay shows “View Details”.

Modal displays specialty, fee, bio, availability.

Book with X button deep-links to patient booking; respects auth.

Doctors directory

Search by name/specialty, filter by specialty & fee range.

Contact

Validates name/email/message.

On submit:

Saves inquiry in DB.

Sends email to clinic & auto-reply to sender.

Shows success/error inline.

Patient Dashboard

Book: select doctor → date → time (auto slots). Reason optional.

Slots backend:

/patient/slots?doctorId=...&date=YYYY-MM-DD returns open 30-min times,

Excludes already booked, respects maxPatientsPerDay cap.

Appointments: cancel if not confirmed.

Reports: open file links.

Admin Dashboard

Overview: counts.

Doctors: CRUD + CSV + filters.

Patients: list + delete + export + filters.

All Users: read-only table.

Inquiries: read/unread, delete.

🔗 Core API (high level)

Auth

POST /auth/patient/login • POST /auth/patient/register • POST /auth/logout • GET /auth/me

Public

GET /public/doctors → list (safe fields)

POST /public/contact → { name, email, message }

Patient

GET /patient/doctors → booking list (name/email/specialty/fee/availability)

GET /patient/slots?doctorId&date → string[] HH:MM

GET /patient/appointments • POST /patient/appointments • DELETE /patient/appointments/:id

GET /patient/reports

Admin

GET /admin/stats

GET /admin/users • GET /admin/patients

POST /admin/doctors • PUT /admin/doctors/:id • DELETE /admin/doctors/:id

Inquiries: GET /admin/inquiries • PATCH /admin/inquiries/:id/read • DELETE /admin/inquiries/:id

Booking logic (server-side):

Validates that requested time is inside availability.

Blocks overlaps within ±30 minutes.

Blocks once the daily cap (maxPatientsPerDay) is reached.

📨 Email Behavior

Transport: Nodemailer via your SMTP.

From: MAIL_FROM

Admin to: MAIL_TO_ADMIN

Templates: simple text/HTML (contact receipt & admin notification).

If sending fails, the API still validates and returns proper error messages.