// backend/src/scripts/wipeAdmins.ts
import { connectDB } from '../config/db';
import { User } from '../models/User';

(async () => {
  await connectDB();
  const res = await User.deleteMany({ role: 'admin' });
  console.log('Deleted admins:', res.deletedCount);
  process.exit(0);
})();
