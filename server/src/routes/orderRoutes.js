import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { protect, adminOnly } from "../middleware/auth.js";
import orderNumber from "../utils/orderNumber.js";
import { decrementOrderInventory, InventoryUnavailableError, restoreOrderInventory, withInventoryTransaction } from "../utils/inventory.js";
const router = Router();

router.post("/", protect, async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = "COD", couponCode } = req.body;
    if (!Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ message: "Your cart is empty or invalid." });
    if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.postalCode)
      return res.status(400).json({ message: "Complete shipping address is required." });
    if (!["COD", "RAZORPAY"].includes(paymentMethod)) return res.status(400).json({ message: "Invalid payment method." });
    const requestedItems = new Map();
    for (const item of items) {
      if (!item || !mongoose.isValidObjectId(item.productId)) return res.status(400).json({ message: "Invalid product." });
      const quantity = Number(item.quantity);
      const size = String(item.size || "").trim();
      if (!size || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ message: "Invalid product size or quantity." });
      const key = `${item.productId}-${size}`;
      const existing = requestedItems.get(key);
      const combinedQuantity = (existing?.quantity || 0) + quantity;
      if (combinedQuantity > 20) return res.status(400).json({ message: "A product size cannot exceed 20 items per order." });
      requestedItems.set(key, { productId: item.productId, size, quantity: combinedQuantity });
    }

    const resolved = [];
    let subtotal = 0;
    for (const { productId, size, quantity: qty } of requestedItems.values()) {
      const product = await Product.findOne({ _id: productId, isActive: true });
      const sizeStock = product?.sizes.find(s => s.size === size);
      if (!product || !sizeStock || sizeStock.stock < qty) return res.status(400).json({ message: `Insufficient stock or invalid size for ${product?.name || "a product"}.` });
      resolved.push({ product, qty, size });
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
    const orderData = {
      orderNumber: orderNumber(), customer: req.user._id,
      items: resolved.map(({ product, qty, size }) => ({ product: product._id, name: product.name, image: product.images[0] || "", gender: product.gender, categoryName: product.categoryName, requiresSize: product.requiresSize ?? !/^sarees?$/i.test(String(product.categoryName || "").trim()), size, quantity: qty, unitPrice: product.price })),
      shippingAddress, subtotal, discount, total, couponCode: normalizedCoupon,
      paymentMethod, paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
      status: "Pending"
    };
    let order;
    if (paymentMethod === "COD") {
      try {
        await withInventoryTransaction(async session => {
          [order] = await Order.create([{ ...orderData, inventoryStatus: "deducted" }], { session });
          await decrementOrderInventory(order, session);
        });
      } catch (e) {
        if (e instanceof InventoryUnavailableError) return res.status(409).json({ message: e.message });
        throw e;
      }
    } else order = await Order.create({ ...orderData, inventoryStatus: "none" });
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
    let order;
    try {
      await withInventoryTransaction(async session => {
        order = await Order.findById(req.params.id).session(session);
        if (!order) throw new OrderActionError(404, "Order not found.");
        if (req.user.role !== "admin" && String(order.customer) !== String(req.user._id)) throw new OrderActionError(403, "Access denied.");
        if (!["Pending", "Confirmed", "Processing"].includes(order.status)) throw new OrderActionError(400, "This order can no longer be cancelled online. Please contact the shop.");

        const wasPaid = ["Paid", "Refund Pending"].includes(order.paymentStatus);
        const hadReservedStock = ["reserved", "deducted"].includes(order.inventoryStatus)
          || (order.inventoryStatus === "none" && (order.paymentMethod === "COD" || wasPaid));
        if (hadReservedStock) {
          await restoreOrderInventory(order, session);
          order.inventoryStatus = "released";
          order.inventoryReservationExpiresAt = undefined;
        }
        if (wasPaid) order.paymentStatus = "Refund Pending";
        order.status = "Cancelled";
        order.cancelledAt = new Date();
        order.cancellationReason = String(req.body.reason || "Cancelled by customer").slice(0, 300);
        await order.save({ session });
      });
    } catch (e) {
      if (e instanceof OrderActionError) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    res.json({ order, message: "Order cancelled. If prepaid, refund processing may be required." });
  } catch (e) { next(e); }
});
router.patch("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const allowed = ["Confirmed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
    if (req.body.status === "Cancelled") {
      let cancelledOrder;
      try {
        await withInventoryTransaction(async session => {
          cancelledOrder = await Order.findById(req.params.id).session(session);
          if (!cancelledOrder) throw new OrderActionError(404, "Order not found.");
          if (cancelledOrder.status === "Cancelled") return;

          const canRestoreStock = !["Shipped", "Out for Delivery", "Delivered"].includes(cancelledOrder.status);
          const wasPaid = ["Paid", "Refund Pending"].includes(cancelledOrder.paymentStatus);
          const hadReservedStock = ["reserved", "deducted"].includes(cancelledOrder.inventoryStatus)
            || (cancelledOrder.inventoryStatus === "none" && (cancelledOrder.paymentMethod === "COD" || wasPaid));
          if (canRestoreStock && hadReservedStock) {
            await restoreOrderInventory(cancelledOrder, session);
            cancelledOrder.inventoryStatus = "released";
            cancelledOrder.inventoryReservationExpiresAt = undefined;
          }
          if (wasPaid) cancelledOrder.paymentStatus = "Refund Pending";
          cancelledOrder.status = "Cancelled";
          cancelledOrder.cancelledAt = new Date();
          cancelledOrder.cancellationReason = String(req.body.deliveryMessage || "Cancelled by admin").slice(0, 300);
          await cancelledOrder.save({ session });
        });
      } catch (e) {
        if (e instanceof OrderActionError) return res.status(e.status).json({ message: e.message });
        throw e;
      }
      return res.json(cancelledOrder);
    }
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
class OrderActionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export default router;
