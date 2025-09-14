import { Request, Response } from 'express';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { patientRegisterSchema, loginSchema } from '../validators/authSchemas';
import { sendToken } from '../utils/sendToken';

export const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const user = await User.findById(req.user.sub).select('name email role');
  res.json({ user });
});

// PATIENT register + login
export const patientRegister = asyncHandler(async (req, res) => {
  const data = patientRegisterSchema.parse(req.body);
  const exists = await User.findOne({ email: data.email });
  if (exists) return res.status(409).json({ message: 'Email already in use' });
  const user = await User.create({ ...data, role: 'patient' });
  sendToken(res, user);
  res.status(201).json({ message: 'Registered', user: { name: user.name, email: user.email, role: user.role } });
});

export const patientLogin = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email, role: 'patient' }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  sendToken(res, user);
  res.json({ message: 'Logged in' });
});

// ADMIN login (no signup)
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email, role: 'admin' }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  sendToken(res, user);
  res.json({ message: 'Logged in' });
});

// DOCTOR login (created by admin)
export const doctorLogin = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email, role: 'doctor' }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  sendToken(res, user);
  res.json({ message: 'Logged in' });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});
