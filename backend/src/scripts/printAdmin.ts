import { connectDB } from "../config/db";
import { User } from "../models/User";

(async () => {
  await connectDB();
  const admin = await User.findOne({ role: "admin" }).select("+password");
  console.log("ADMIN DOC:", admin);
  process.exit(0);
})();
