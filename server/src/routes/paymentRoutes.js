import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/auth.js";
const router = Router();
function gateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}
router.post("/razorpay/order", protect, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.user._id, paymentMethod: "RAZORPAY", status: "Pending" });
    if (!order) return res.status(404).json({ message: "Pending online order not found." });
    const rp = gateway();
    if (!rp) return res.status(503).json({ message: "Razorpay is not configured. Add test keys to server/.env." });
    const paymentOrder = await rp.orders.create({ amount: Math.round(order.total * 100), currency: "INR", receipt: order.orderNumber, notes: { appOrderId: String(order._id) } });
    order.paymentOrderId = paymentOrder.id;
    await order.save();
    res.json({ id: paymentOrder.id, amount: paymentOrder.amount, currency: paymentOrder.currency, key: process.env.RAZORPAY_KEY_ID, order });
  } catch (e) { next(e); }
});
router.post("/razorpay/verify", protect, async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.user._id, paymentMethod: "RAZORPAY" });
    if (!order || order.paymentOrderId !== razorpay_order_id) return res.status(400).json({ message: "Payment order mismatch." });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!process.env.RAZORPAY_KEY_SECRET || expected !== razorpay_signature) return res.status(400).json({ message: "Payment signature verification failed." });
    order.paymentId = razorpay_payment_id;
    order.paymentStatus = "Paid";
    order.status = "Confirmed";
    await order.save();
    // Reserve stock after verified payment; check stock again to avoid overselling.
    for (const item of order.items) {
      const p = await Product.findById(item.product);
      if (!p) continue;
      const s = p.sizes.find(x => x.size === item.size);
      if (!s || s.stock < item.quantity) {
        order.status = "Pending";
        order.paymentStatus = "Paid";
        await order.save();
        return res.status(409).json({ message: "Payment succeeded, but stock needs admin review. Contact the shop for assistance." });
      }
      s.stock -= item.quantity;
      await p.save();
    }
    res.json({ message: "Payment verified.", order });
  } catch (e) { next(e); }
});
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send("Webhook secret not configured");
    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
    if (!signature || expected !== signature) return res.status(400).send("Invalid signature");
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.captured") {
      const p = event.payload?.payment?.entity;
      const order = await Order.findOne({ paymentOrderId: p?.order_id });
      if (order && order.paymentStatus !== "Paid") {
        order.paymentId = p.id; order.paymentStatus = "Paid";
        if (order.status === "Pending") order.status = "Confirmed";
        await order.save();
      }
    }
    res.json({ received: true });
  } catch (e) { console.error("Webhook error", e.message); res.status(400).send("Webhook processing error"); }
});
export default router;
