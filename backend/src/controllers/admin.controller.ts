import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { DoctorProfile } from '../models/DoctorProfile';
import { Appointment } from '../models/Appointment';
import { Report } from '../models/Report';


export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, specialty, fee } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already used' });
  const doctor = await User.create({ name, email, password, role: 'doctor' });
  await DoctorProfile.create({ user: doctor._id, specialty, fee });
  res.status(201).json({ message: 'Doctor created', id: doctor._id });
});

export const listPatients = asyncHandler(async (_req, res) => {
  const patients = await User.find({ role: 'patient' }).select('name email role createdAt');
  res.json({ patients });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await User.findOne({ _id: id, role: 'patient' });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  // Clean up related data
  await Appointment.deleteMany({ patient: id });
  await Report.deleteMany({ patient: id });

  await patient.deleteOne();
  res.json({ message: 'Patient deleted' });
});


export const listStats = asyncHandler(async (_req, res) => {
  const patients = await User.countDocuments({ role: 'patient' });
  const doctors = await User.countDocuments({ role: 'doctor' });
  const admins  = await User.countDocuments({ role: 'admin' });
  res.json({ users: { patients, doctors, admins, total: patients + doctors + admins } });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('name email role createdAt');
  res.json({ users });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, specialty, fee } = req.body;
  const doc = await User.findOne({ _id: id, role: 'doctor' });
  if (!doc) return res.status(404).json({ message: 'Doctor not found' });
  if (name) doc.name = name;
  if (email) doc.email = email;
  if (password) doc.password = password; // pre-save hook will hash
  await doc.save();
  await DoctorProfile.updateOne({ user: doc._id }, { $set: { specialty, fee } }, { upsert: true });
  res.json({ message: 'Doctor updated' });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doc = await User.findOne({ _id: id, role: 'doctor' });
  if (!doc) return res.status(404).json({ message: 'Doctor not found' });

  // Clean up related data
  await Appointment.deleteMany({ doctor: id });
  await Report.deleteMany({ doctor: id });
  await DoctorProfile.deleteOne({ user: id });

  await doc.deleteOne();
  res.json({ message: 'Doctor deleted' });
});
