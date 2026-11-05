import { Router } from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();
router.use(protect, adminOnly);
router.get("/dashboard", async (_req, res, next) => {
  try {
    const [products, customers, orders, lowStock, paidAgg, recentOrders] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true, sizes: { $not: { $elemMatch: { stock: { $gt: 0 } } } } }),
      Order.aggregate([{ $match: { paymentStatus: "Paid" } }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
      Order.find().populate("customer", "name email").sort({ createdAt: -1 }).limit(8)
    ]);
    res.json({ products, customers, orders, lowStock, revenue: paidAgg[0]?.revenue || 0, recentOrders });
  } catch (e) { next(e); }
});
router.get("/customers", async (_req, res, next) => {
  try { res.json(await User.find({ role: "customer" }).select("name email phone createdAt").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
export default router;
