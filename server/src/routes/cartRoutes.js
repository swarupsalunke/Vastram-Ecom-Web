import { Router } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.use(protect);
router.get("/", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({ path: "items.product", populate: { path: "category", select: "name requiresSize" } });
    const grouped = new Map();
    for (const item of cart?.items || []) {
      if (!item.product || !item.product.isActive) continue;
      const key = `${item.product._id}-${item.size}`;
      const availableStock = item.product.sizes.find(size => size.size === item.size)?.stock || 0;
      if (availableStock < 1) continue;
      const existing = grouped.get(key);
      if (existing) existing.quantity = Math.min(20, availableStock, existing.quantity + item.quantity);
      else grouped.set(key, { product: item.product, size: item.size, quantity: Math.min(20, availableStock, item.quantity) });
    }
    res.json({ items: [...grouped.values()] });
  } catch (e) { next(e); }
});
router.put("/", async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length > 50) return res.status(400).json({ message: "Invalid cart items." });
    const items = [];
    for (const item of req.body.items) {
      const product = await Product.findOne({ _id: item.productId, isActive: true });
      const size = String(item.size || "");
      const quantity = Math.floor(Number(item.quantity));
      const sizeStock = product?.sizes.find(s => s.size === size)?.stock || 0;
      if (!product || quantity < 1 || quantity > 20) return res.status(400).json({ message: "Invalid cart item." });
      const found = items.find(x => String(x.product) === String(product._id) && x.size === size);
      if (sizeStock < quantity || sizeStock < (found?.quantity || 0) + quantity) return res.status(409).json({ message: `Only ${sizeStock} item(s) are available for ${product.name} (${size}).` });
      if (found) found.quantity += quantity;
      else items.push({ product: product._id, size, quantity });
    }
    const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items } }, { new: true, upsert: true, runValidators: true });
    res.json({ message: "Cart saved.", count: cart.items.reduce((n, i) => n + i.quantity, 0) });
  } catch (e) { next(e); }
});
router.delete("/", async (req, res, next) => {
  try { await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } }, { upsert: true }); res.json({ message: "Cart cleared." }); } catch (e) { next(e); }
});
export default router;
