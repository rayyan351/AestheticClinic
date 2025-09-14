import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { Role } from '../constants/roles';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  (this as any).password = await bcrypt.hash((this as any).password, 10);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
