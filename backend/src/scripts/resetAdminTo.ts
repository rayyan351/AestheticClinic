import { connectDB } from '../config/db';
import { User } from '../models/User';

const targetEmail = 'admin@clinic.local';      // new email you want
const targetPassword = 'StrongAdmin#123';      // new password you want

(async () => {
  await connectDB();

  // Grab the first admin we find (or choose by old email if you know it)
  const admin = await User.findOne({ role: 'admin' }).select('+password');
  if (!admin) {
    console.log('No admin found to reset.');
    process.exit(0);
  }

  admin.email = targetEmail;
  admin.password = targetPassword; // will be hashed by pre-save
  await admin.save();

  console.log('Admin updated to:', targetEmail);
  process.exit(0);
})();
