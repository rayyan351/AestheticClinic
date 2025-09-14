import { api } from "./api";

export type Role = "patient" | "doctor" | "admin";

export type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  // (These fields aren't typical for users; keeping since they exist in your type)
  message: string;
  read: boolean;
};

export type Stats = {
  users: { patients: number; doctors: number; admins: number; total: number };
};

export async function fetchStats(): Promise<Stats> {
  const { data } = await api.get("/admin/stats");
  return data;
}

export async function fetchUsers(): Promise<UserRow[]> {
  const { data } = await api.get("/admin/users");
  return data.users;
}

export type DoctorCreateInput = {
  name: string;
  email: string;
  password: string;
  specialty?: string;
  fee?: number;
};

export async function createDoctor(input: DoctorCreateInput) {
  const { data } = await api.post("/admin/doctors", input);
  return data;
}

export type DoctorUpdateInput = {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  specialty?: string;
  fee?: number;
};

export async function updateDoctor(input: DoctorUpdateInput) {
  const { id, ...rest } = input;
  const { data } = await api.put(`/admin/doctors/${id}`, rest); // ✅ fixed backticks
  return data;
}

export async function deleteDoctor(id: string) {
  const { data } = await api.delete(`/admin/doctors/${id}`); // ✅ fixed backticks
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function fetchPatients(): Promise<UserRow[]> {
  const { data } = await api.get("/admin/patients");
  return data.patients;
}

export async function deletePatient(id: string) {
  const { data } = await api.delete(`/admin/patients/${id}`); // ✅ fixed backticks
  return data;
}

/* ---------- NEW: Contact inquiries ---------- */

export type Inquiry = {
  _id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export async function fetchInquiries(): Promise<Inquiry[]> {
  const { data } = await api.get("/admin/inquiries");
  return data.inquiries;
}

export async function markInquiryRead(id: string, read: boolean): Promise<Inquiry> {
  const { data } = await api.patch(`/admin/inquiries/${id}/read`, { read });
  return data.inquiry;
}

export async function deleteInquiry(id: string): Promise<void> {
  await api.delete(`/admin/inquiries/${id}`);
}
