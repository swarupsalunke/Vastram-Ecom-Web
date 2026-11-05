import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
const router = Router();

function tokenFor(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, addresses: user.addresses };
}
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8)
      return res.status(400).json({ message: "Name, email and password (at least 8 characters) are required." });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12), role: "customer" });
    res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) { next(e); }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase().trim() }).select("+password");
    if (!user || !(await bcrypt.compare(password || "", user.password)))
      return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) { next(e); }
});
router.get("/me", protect, (req, res) => res.json({ user: safeUser(req.user) }));
router.patch("/profile", protect, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name !== undefined) req.user.name = String(name).trim().slice(0, 100);
    if (phone !== undefined) req.user.phone = String(phone).trim().slice(0, 30);
    await req.user.save();
    res.json({ user: safeUser(req.user) });
  } catch (e) { next(e); }
});
export default router;
