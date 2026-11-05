import { Router } from "express";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const q = { isActive: true };
    if (["Men", "Women"].includes(req.query.gender)) q.gender = req.query.gender;
    res.json(await Category.find(q).sort({ gender: 1, name: 1 }));
  } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await Category.find().sort({ gender: 1, name: 1 })); } catch (e) { next(e); }
});
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const gender = req.body.gender;
    if (!name || !["Men", "Women"].includes(gender)) return res.status(400).json({ message: "Category name and gender are required." });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const category = await Category.create({ name, gender, slug });
    res.status(201).json(category);
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: "This category already exists for that gender." }); next(e); }
});
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name).trim();
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (req.body.gender !== undefined) updates.gender = req.body.gender;
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ message: "Category not found." });
    const mismatch = await Product.exists({ category: cat._id, gender: { $ne: cat.gender } });
    if (mismatch) return res.status(400).json({ message: "Category gender conflicts with existing products. Update products first." });
    await Product.updateMany({ category: cat._id }, { categoryName: cat.name });
    res.json(cat);
  } catch (e) { next(e); }
});
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const used = await Product.exists({ category: req.params.id });
    if (used) return res.status(409).json({ message: "This category has products. Move or remove those products before deleting the category." });
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found." });
    res.json({ message: "Category deleted." });
  } catch (e) { next(e); }
});
export default router;
