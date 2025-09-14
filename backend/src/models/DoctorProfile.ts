// src/models/DoctorProfile.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoctorProfile extends Document {
  user: Types.ObjectId; // ref User with role=doctor
  specialty?: string;
  fee?: number;
  availability?: { day: string; start: string; end: string }[];
  maxPatientsPerDay?: number; // NEW: daily cap
}

const DoctorProfileSchema = new Schema<IDoctorProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialty: String,
    fee: Number,
    availability: [{ day: String, start: String, end: String }],
    maxPatientsPerDay: { type: Number, default: 20 }, // NEW: default 20
  },
  { timestamps: true }
);

export const DoctorProfile = mongoose.model<IDoctorProfile>(
  'DoctorProfile',
  DoctorProfileSchema
);
