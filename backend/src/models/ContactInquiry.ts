import mongoose, { Schema, Document } from "mongoose";

export interface IContactInquiry extends Document {
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactInquirySchema = new Schema<IContactInquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ContactInquiry = mongoose.model<IContactInquiry>(
  "ContactInquiry",
  ContactInquirySchema
);
