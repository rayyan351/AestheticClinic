import { api } from "./api";

export type DoctorLite = {
  _id: string;
  name: string;
  email: string;
  specialty: string;
  fee: number | null;
  availability: { day: string; start: string; end: string }[];
};

export async function listDoctors(): Promise<DoctorLite[]> {
  const { data } = await api.get("/patient/doctors");
  return data.doctors;
}

export type PatientAppointment = {
  _id: string;
  doctor: { _id: string; name: string; email: string };
  datetime: string;
  reason?: string;
  status: "pending" | "confirmed" | "rejected";
};

export async function myAppointments(): Promise<PatientAppointment[]> {
  const { data } = await api.get("/patient/appointments");
  return data.appointments;
}

export async function bookAppointment(payload: { doctorId: string; datetime: string; reason?: string }) {
  const { data } = await api.post("/patient/appointments", payload);
  return data.appointment as PatientAppointment;
}

export async function cancelAppointment(id: string) {
  const { data } = await api.delete(`/patient/appointments/${id}`);
  return data;
}

export type PatientReport = {
  _id: string;
  doctor: { _id: string; name: string; email: string };
  title: string;
  notes?: string;
  fileUrl?: string;
  createdAt: string;
};

export async function myReportsList(): Promise<PatientReport[]> {
  const { data } = await api.get("/patient/reports");
  return data.reports;
}
