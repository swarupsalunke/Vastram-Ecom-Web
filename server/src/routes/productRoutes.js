import { Router } from "express";
import { randomUUID } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import multer from "multer";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { uploadDirectory } from "../utils/uploads.js";
const router = Router();
const imageExtensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const maxImageCount = 10;
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${imageExtensions[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: maxImageCount },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) return callback(new UnsupportedImageTypeError());
    callback(null, true);
  }
});

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
router.post("/images", protect, adminOnly, (req, res, next) => {
  upload.array("images", maxImageCount)(req, res, async error => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      const tooMany = error.code === "LIMIT_FILE_COUNT";
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge ? "Each image must be 5 MB or smaller." : tooMany ? "Upload up to 10 images at a time." : "Invalid image upload."
      });
    }
    if (error instanceof UnsupportedImageTypeError) return res.status(400).json({ message: error.message });
    if (error) return next(error);
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "Choose at least one image to upload." });
    try {
      const signaturesValid = await Promise.all(files.map(hasValidImageSignature));
      if (!signaturesValid.every(Boolean)) {
        await Promise.all(files.map(file => unlink(file.path)));
        return res.status(400).json({ message: "One or more selected files are not valid images." });
      }
    } catch (validationError) { return next(validationError); }
    const protocol = req.protocol;
    const host = req.get("host");
    res.status(201).json({ images: files.map(file => `${protocol}://${host}/uploads/${file.filename}`) });
  });
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
class UnsupportedImageTypeError extends Error {
  constructor() { super("Only JPG, PNG, and WebP images are supported."); }
}
async function hasValidImageSignature(file) {
  const handle = await open(file.path, "r");
  const header = Buffer.alloc(12);
  try { await handle.read(header, 0, header.length, 0); }
  finally { await handle.close(); }
  if (file.mimetype === "image/jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (file.mimetype === "image/png") return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return file.mimetype === "image/webp" && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
}
export default router;
