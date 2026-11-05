import { Router } from "express";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const q = { isActive: true };
    if (["Men", "Women"].includes(req.query.gender)) q.gender = req.query.gender;
    if (req.query.category) {
      const cat = await Category.findOne({ _id: req.query.category, isActive: true });
      if (cat) q.category = cat._id;
      else if (/^[a-f\d]{24}$/i.test(req.query.category)) return res.json([]);
    }
    if (req.query.size) q.sizes = { $elemMatch: { size: req.query.size, stock: { $gt: 0 } } };
    if (req.query.color) q.colors = req.query.color;
    if (req.query.available === "true") q.sizes = { $elemMatch: { stock: { $gt: 0 } } };
    if (req.query.minPrice || req.query.maxPrice) q.price = { ...(req.query.minPrice ? { $gte: Number(req.query.minPrice) } : {}), ...(req.query.maxPrice ? { $lte: Number(req.query.maxPrice) } : {}) };
    if (req.query.search) q.name = { $regex: String(req.query.search).slice(0, 80), $options: "i" };
    let query = Product.find(q).populate("category", "name gender").lean();
    if (req.query.sort === "price-asc") query = query.sort({ price: 1 });
    else if (req.query.sort === "price-desc") query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });
    res.json(await query.limit(200));
  } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await Product.find().populate("category", "name gender").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate("category", "name gender");
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (e) { next(e); }
});
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { name, gender, category, price, sizes = [], colors = [], images = [] } = req.body;
    const cat = await Category.findById(category);
    if (!cat || cat.gender !== gender) return res.status(400).json({ message: "Choose a category matching the selected gender." });
    if (!name?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: "Valid product name and price are required." });
    const product = await Product.create({ ...req.body, name: name.trim(), category: cat._id, categoryName: cat.name, price: Number(price), sizes: normalizeSizes(sizes), colors: normalizeStrings(colors), images: normalizeStrings(images) });
    res.status(201).json(product);
  } catch (e) { next(e); }
});
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates._id; delete updates.__v;
    if (updates.category || updates.gender) {
      const current = await Product.findById(req.params.id);
      if (!current) return res.status(404).json({ message: "Product not found." });
      const cat = await Category.findById(updates.category || current.category);
      const gender = updates.gender || current.gender;
      if (!cat || cat.gender !== gender) return res.status(400).json({ message: "Category must match product gender." });
      updates.category = cat._id; updates.categoryName = cat.name;
    }
    if (updates.sizes) updates.sizes = normalizeSizes(updates.sizes);
    if (updates.colors) updates.colors = normalizeStrings(updates.colors);
    if (updates.images) updates.images = normalizeStrings(updates.images);
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate("category", "name gender");
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (e) { next(e); }
});
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    // Preserve historical order snapshots; archive instead of hard-deleting.
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product removed from the storefront." });
  } catch (e) { next(e); }
});
function normalizeStrings(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(x => String(x).trim()).filter(Boolean))].slice(0, 30);
}
function normalizeSizes(value) {
  if (!Array.isArray(value)) return [];
  return value.map(s => ({ size: String(s.size || "").trim(), stock: Math.max(0, Math.floor(Number(s.stock) || 0)) })).filter(s => s.size).slice(0, 30);
}
export default router;
