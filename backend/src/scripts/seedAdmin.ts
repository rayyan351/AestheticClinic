import { connectDB } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';

(async () => {
  await connectDB();

  // ensure exactly one admin with the desired email/password
  const existingOtherAdmins = await User.find({ role: 'admin', email: { $ne: env.ADMIN_EMAIL } });
  if (existingOtherAdmins.length) {
    console.log(`Found ${existingOtherAdmins.length} admin(s) with other emails. Leaving them as-is for safety.`);
  }

  const admin = await User.findOne({ email: env.ADMIN_EMAIL, role: 'admin' });
  if (!admin) {
    await User.create({
      name: 'Site Admin',
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD, // hashed by pre-save
      role: 'admin'
    });
    console.log('Admin seeded:', env.ADMIN_EMAIL);
  } else {
    admin.password = env.ADMIN_PASSWORD; // will be re-hashed by pre-save hook
    await admin.save();
    console.log('Admin password reset for:', env.ADMIN_EMAIL);
  }

  process.exit(0);
})();
