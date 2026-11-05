import { Router } from "express";
import DeliveryMessage from "../models/DeliveryMessage.js";
import Order from "../models/Order.js";
import { protect, adminOnly } from "../middleware/auth.js";
const router = Router();
router.get("/mine", protect, async (req, res, next) => {
  try { res.json(await DeliveryMessage.find({ customer: req.user._id }).populate("order", "orderNumber status").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.get("/admin/all", protect, adminOnly, async (_req, res, next) => {
  try { res.json(await DeliveryMessage.find().populate("order", "orderNumber").populate("customer", "name email").sort({ createdAt: -1 })); } catch (e) { next(e); }
});
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const order = await Order.findById(req.body.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    if (!title || !message) return res.status(400).json({ message: "Title and message are required." });
    const created = await DeliveryMessage.create({ order: order._id, customer: order.customer, title, message });
    order.deliveryMessage = message;
    await order.save();
    res.status(201).json(created);
  } catch (e) { next(e); }
});
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const msg = await DeliveryMessage.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found." });
    res.json({ message: "Message deleted." });
  } catch (e) { next(e); }
});
export default router;
