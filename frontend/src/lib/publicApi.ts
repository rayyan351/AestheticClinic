// src/lib/publicApi.ts
import { api } from "./api";

export type PublicAvailability = { day: string; start: string; end: string };

export type PublicDoctor = {
  _id: string;
  name: string;
  email: string;
  profile?: {
    specialty?: string;
    fee?: number;
    availability?: PublicAvailability[];
    experienceYears?: number;
    bio?: string;
  };
  createdAt?: string;
};

export async function listDoctorsPublic(): Promise<PublicDoctor[]> {
  const res = await api.get("/public/doctors"); // baseURL + /api already in api instance
  return res.data;
}

export async function submitContact(payload: { name: string; email: string; message: string }) {
  const res = await api.post("/public/contact", payload);
  return res.data as { message: string; inquiry: { id: string } };
}
