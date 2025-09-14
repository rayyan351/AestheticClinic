import { api } from "./api";

export type Availability = { day: string; start: string; end: string };

export type DoctorProfile = {
  specialty?: string;
  fee?: number;
  availability?: Availability[];
};

export type DoctorMe = {
  user: { _id: string; name: string; email: string; role: "doctor" };
  profile?: DoctorProfile | null;
};

export async function getDoctorMe(): Promise<DoctorMe> {
  const { data } = await api.get("/doctor/me");
  return data;
}

export async function saveDoctorMe(input: DoctorProfile) {
  const { data } = await api.put("/doctor/me", input);
  return data;
}

export type Appointment = {
  _id: string;
  patient: { _id: string; name: string; email: string };
  doctor: string;
  datetime: string;
  reason?: string;
  status: "pending" | "confirmed" | "rejected";
};

export async function getDoctorAppointments(): Promise<Appointment[]> {
  const { data } = await api.get("/doctor/appointments");
  return data.appointments;
}

export async function setAppointmentStatus(id: string, status: "pending"|"confirmed"|"rejected") {
  const { data } = await api.patch(`/doctor/appointments/${id}/status`, { status });
  return data;
}

export type Report = {
  _id: string;
  patient: { _id: string; name: string; email: string };
  doctor: string;
  title: string;
  notes?: string;
  fileUrl?: string;
  createdAt: string;
};

export async function createReport(payload: { patientId: string; title: string; notes?: string; fileUrl?: string }) {
  const { data } = await api.post("/doctor/reports", payload);
  return data.report as Report;
}

export async function listReports(): Promise<Report[]> {
  const { data } = await api.get("/doctor/reports");
  return data.reports;
}
