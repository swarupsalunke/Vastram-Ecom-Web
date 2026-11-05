import { Router } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.use(protect);
router.get("/", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    res.json({ items: (cart?.items || []).filter(i => i.product && i.product.isActive).map(i => ({ product: i.product, size: i.size, color: i.color, quantity: i.quantity })) });
  } catch (e) { next(e); }
});
router.put("/", async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length > 50) return res.status(400).json({ message: "Invalid cart items." });
    const items = [];
    for (const item of req.body.items) {
      const product = await Product.findOne({ _id: item.productId, isActive: true });
      const size = String(item.size || "");
      const color = String(item.color || "");
      const quantity = Math.floor(Number(item.quantity));
      if (!product || !product.sizes.some(s => s.size === size && s.stock > 0) || quantity < 1 || quantity > 20 || (color && !product.colors.includes(color))) continue;
      const found = items.find(x => String(x.product) === String(product._id) && x.size === size && x.color === color);
      if (found) found.quantity = Math.min(20, found.quantity + quantity);
      else items.push({ product: product._id, size, color, quantity });
    }
    const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items } }, { new: true, upsert: true, runValidators: true });
    res.json({ message: "Cart saved.", count: cart.items.reduce((n, i) => n + i.quantity, 0) });
  } catch (e) { next(e); }
});
router.delete("/", async (req, res, next) => {
  try { await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } }, { upsert: true }); res.json({ message: "Cart cleared." }); } catch (e) { next(e); }
});
export default router;
