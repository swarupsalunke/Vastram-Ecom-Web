import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import User from "../src/models/User.js";
dotenv.config();
const rl = readline.createInterface({ input, output });
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const name = (await rl.question("Admin name: ")).trim();
  const email = (await rl.question("Admin email: ")).trim().toLowerCase();
  const password = await rl.question("Admin password (min 8 chars): ");
  if (!name || !email || password.length < 8) throw new Error("Name/email required and password must be at least 8 characters.");
  const hash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email }).select("+password");
  if (existing) {
    existing.name = name; existing.password = hash; existing.role = "admin";
    await existing.save();
    console.log("Existing account promoted to admin.");
  } else {
    await User.create({ name, email, password: hash, role: "admin" });
    console.log("Admin account created.");
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await mongoose.disconnect();
}
