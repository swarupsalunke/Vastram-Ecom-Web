import { Router } from "express";
import Coupon from "../models/Coupon.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();
router.get("/", async (_req, res, next) => {
  try { res.json(await Coupon.find({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("code type value minOrderAmount maxDiscount expiresAt")); } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await Coupon.find().sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const type = req.body.type;
    const value = Number(req.body.value);
    if (!code || !["fixed", "percentage"].includes(type) || !Number.isFinite(value) || value <= 0 || (type === "percentage" && value > 100))
      return res.status(400).json({ message: "Enter a valid coupon code, type and value." });
    const coupon = await Coupon.create({ ...req.body, code, type, value });
    res.status(201).json(coupon);
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: "Coupon code already exists." }); next(e); }
});
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.code) data.code = String(data.code).toUpperCase().trim();
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.json(coupon);
  } catch (e) { next(e); }
});
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.json({ message: "Coupon deleted." });
  } catch (e) { next(e); }
});
export default router;
