import mongoose, { Schema, Document, Types } from 'mongoose';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected';

export interface IAppointment extends Document {
  patient: Types.ObjectId; // User (patient)
  doctor: Types.ObjectId;  // User (doctor)
  datetime: Date;
  reason?: string;
  status: AppointmentStatus;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    datetime: { type: Date, required: true },
    reason: String,
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
