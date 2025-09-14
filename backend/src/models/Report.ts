import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReport extends Document {
  patient: Types.ObjectId; // User (patient)
  doctor: Types.ObjectId;  // User (doctor)
  title: string;
  notes?: string;
  fileUrl?: string; // later we can add storage
}

const ReportSchema = new Schema<IReport>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    notes: String,
    fileUrl: String
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
