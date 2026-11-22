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
    if (req.query.subcategory) q.subcategory = String(req.query.subcategory).trim();
    if (req.query.size) q.sizes = { $elemMatch: { size: req.query.size, stock: { $gt: 0 } } };
    if (req.query.available === "true") q.sizes = { $elemMatch: { stock: { $gt: 0 } } };
    if (req.query.minPrice || req.query.maxPrice) q.price = { ...(req.query.minPrice ? { $gte: Number(req.query.minPrice) } : {}), ...(req.query.maxPrice ? { $lte: Number(req.query.maxPrice) } : {}) };
    if (req.query.search) q.name = { $regex: String(req.query.search).slice(0, 80), $options: "i" };
    let query = Product.find(q).populate("category", "name gender requiresSize").lean();
    if (req.query.sort === "price-asc") query = query.sort({ price: 1 });
    else if (req.query.sort === "price-desc") query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });
    res.json(await query.limit(200));
  } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await Product.find().populate("category", "name gender requiresSize").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate("category", "name gender requiresSize");
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (e) { next(e); }
});
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { name, gender, category, price, sizes = [], images = [] } = req.body;
    const cat = await Category.findById(category);
    if (!cat || cat.gender !== gender) return res.status(400).json({ message: "Choose a category matching the selected gender." });
    if (!name?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: "Valid product name and price are required." });
    const subcategoryResult = normalizeSubcategory(cat, req.body.subcategory);
    if (subcategoryResult.error) return res.status(400).json({ message: subcategoryResult.error });
    const normalizedSizes = normalizeSizes(sizes);
    if (normalizedSizes.error) return res.status(400).json({ message: normalizedSizes.error });
    const requiresSize = categoryRequiresSize(cat);
    const product = await Product.create({ ...req.body, name: name.trim(), category: cat._id, categoryName: cat.name, subcategory: subcategoryResult.value, requiresSize, price: Number(price), sizes: normalizeProductSizes(normalizedSizes.sizes, requiresSize), images: normalizeStrings(images) });
    res.status(201).json(product);
  } catch (e) { next(e); }
});
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates._id; delete updates.__v;
    delete updates.requiresSize;
    let current;
    if (updates.category || updates.gender || updates.sizes !== undefined || updates.subcategory !== undefined) {
      current = await Product.findById(req.params.id);
      if (!current) return res.status(404).json({ message: "Product not found." });
    }
    if (updates.category || updates.gender || updates.subcategory !== undefined) {
      const cat = await Category.findById(updates.category || current.category);
      const gender = updates.gender || current.gender;
      if (!cat || cat.gender !== gender) return res.status(400).json({ message: "Category must match product gender." });
      updates.category = cat._id; updates.categoryName = cat.name; updates.requiresSize = categoryRequiresSize(cat);
      const subcategoryResult = normalizeSubcategory(cat, updates.subcategory !== undefined ? updates.subcategory : current.subcategory);
      if (subcategoryResult.error) return res.status(400).json({ message: subcategoryResult.error });
      updates.subcategory = subcategoryResult.value;
    }
    if (updates.sizes !== undefined) {
      const normalizedSizes = normalizeSizes(updates.sizes);
      if (normalizedSizes.error) return res.status(400).json({ message: normalizedSizes.error });
      const requiresSize = updates.requiresSize ?? current.requiresSize ?? !isSizeFreeCategory(current.categoryName);
      updates.sizes = normalizeProductSizes(normalizedSizes.sizes, requiresSize);
    }
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
  if (!Array.isArray(value) || !value.length) return { sizes: [], error: "Add at least one size and stock entry." };
  if (value.length > 30) return { sizes: [], error: "A product can have up to 30 sizes." };
  const sizes = [];
  const seen = new Set();
  for (const item of value) {
    const size = String(item?.size || "").trim();
    if (item?.stock === null || item?.stock === undefined || item?.stock === "") return { sizes: [], error: `Enter a stock quantity for ${size || "each size"}.` };
    const stock = Number(item?.stock);
    if (!size) return { sizes: [], error: "Every stock entry needs a size name." };
    if (!Number.isInteger(stock) || stock < 0) return { sizes: [], error: `Stock for ${size} must be a non-negative whole number.` };
    const key = size.toLowerCase();
    if (seen.has(key)) return { sizes: [], error: `Size ${size} is listed more than once.` };
    seen.add(key);
    sizes.push({ size, stock });
  }
  return { sizes, error: "" };
}
function normalizeProductSizes(sizes, requiresSize) {
  if (requiresSize) return sizes;
  return [{ size: "One Size", stock: sizes.reduce((total, item) => total + item.stock, 0) }];
}
function categoryRequiresSize(category) {
  return typeof category.requiresSize === "boolean" ? category.requiresSize : !isSizeFreeCategory(category.name);
}
function normalizeSubcategory(category, value) {
  const subcategory = String(value || "").trim();
  if (!subcategory) return { value: "", error: "" };
  const matchingOption = (category.subcategories || []).find(option => option.toLowerCase() === subcategory.toLowerCase());
  return matchingOption
    ? { value: matchingOption, error: "" }
    : { value: "", error: "Choose a subcategory from the selected category." };
}
function isSizeFreeCategory(name) {
  return /^sarees?$/i.test(String(name || "").trim());
}
export default router;
