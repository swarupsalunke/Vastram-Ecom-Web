import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { protect, adminOnly } from "../middleware/auth.js";
import orderNumber from "../utils/orderNumber.js";
const router = Router();

router.post("/", protect, async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = "COD", couponCode } = req.body;
    if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ message: "Your cart is empty or invalid." });
    if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.postalCode)
      return res.status(400).json({ message: "Complete shipping address is required." });
    if (!["COD", "RAZORPAY"].includes(paymentMethod)) return res.status(400).json({ message: "Invalid payment method." });
    const resolved = [];
    let subtotal = 0;
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) return res.status(400).json({ message: "Invalid product." });
      const product = await Product.findOne({ _id: item.productId, isActive: true });
      const qty = Math.floor(Number(item.quantity));
      const size = String(item.size || "");
      const color = String(item.color || "");
      const sizeStock = product?.sizes.find(s => s.size === size);
      if (!product || !sizeStock || !Number.isInteger(qty) || sizeStock.stock < qty || qty < 1 || qty > 20) return res.status(400).json({ message: `Insufficient stock or invalid size for ${product?.name || "a product"}.` });
      if (color && !product.colors.includes(color)) return res.status(400).json({ message: `Invalid color for ${product.name}.` });
      resolved.push({ product, qty, size, color });
      subtotal += product.price * qty;
    }
    let discount = 0;
    let normalizedCoupon = "";
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), isActive: true });
      if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) || subtotal < coupon.minOrderAmount)
        return res.status(400).json({ message: "Coupon is invalid, expired, or order total is too low." });
      discount = coupon.type === "percentage" ? subtotal * coupon.value / 100 : coupon.value;
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(subtotal, Math.round(discount * 100) / 100);
      normalizedCoupon = coupon.code;
    }
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const order = await Order.create({
      orderNumber: orderNumber(), customer: req.user._id,
      items: resolved.map(({ product, qty, size, color }) => ({ product: product._id, name: product.name, image: product.images[0] || "", gender: product.gender, categoryName: product.categoryName, size, color, quantity: qty, unitPrice: product.price })),
      shippingAddress, subtotal, discount, total, couponCode: normalizedCoupon,
      paymentMethod, paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
      status: "Pending"
    });
    if (paymentMethod === "COD") {
      for (const { product, qty, size } of resolved) {
        const p = await Product.findById(product._id);
        const stock = p.sizes.find(s => s.size === size);
        stock.stock -= qty;
        await p.save();
      }
    }
    res.status(201).json({ order, message: paymentMethod === "COD" ? "Order placed successfully." : "Order created. Complete payment to confirm it." });
  } catch (e) { next(e); }
});
router.get("/mine", protect, async (req, res, next) => {
  try { res.json(await Order.find({ customer: req.user._id }).sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await Order.find().populate("customer", "name email phone").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.get("/:id", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("customer", "name email phone");
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (req.user.role !== "admin" && String(order.customer._id) !== String(req.user._id)) return res.status(403).json({ message: "Access denied." });
    res.json(order);
  } catch (e) { next(e); }
});
router.patch("/:id/cancel", protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (req.user.role !== "admin" && String(order.customer) !== String(req.user._id)) return res.status(403).json({ message: "Access denied." });
    if (!["Pending", "Confirmed", "Processing"].includes(order.status)) return res.status(400).json({ message: "This order can no longer be cancelled online. Please contact the shop." });
    if (order.paymentStatus === "Paid") order.paymentStatus = "Refund Pending";
    order.status = "Cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = String(req.body.reason || "Cancelled by customer").slice(0, 300);
    // COD stock is deducted at order creation; online stock is deducted after payment verification.
    // Do not restore stock for an unpaid online order, because it was never deducted.
    if (order.paymentMethod === "COD" || order.paymentStatus === "Paid" || order.paymentStatus === "Refund Pending") {
      for (const item of order.items) {
        if (!item.product) continue;
        const p = await Product.findById(item.product);
        if (!p) continue;
        const s = p.sizes.find(x => x.size === item.size);
        if (s) { s.stock += item.quantity; await p.save(); }
      }
    }
    await order.save();
    res.json({ order, message: "Order cancelled. If prepaid, refund processing may be required." });
  } catch (e) { next(e); }
});
router.patch("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const allowed = ["Confirmed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status === "Cancelled") return res.status(400).json({ message: "Cancelled orders cannot be advanced." });
    order.status = req.body.status;
    if (req.body.deliveryMessage !== undefined) order.deliveryMessage = String(req.body.deliveryMessage).slice(0, 1000);
    if (order.paymentMethod === "COD" && req.body.status === "Delivered") order.paymentStatus = "Paid";
    await order.save();
    res.json(order);
  } catch (e) { next(e); }
});
export default router;
