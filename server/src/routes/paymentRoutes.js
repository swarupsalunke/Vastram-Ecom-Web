import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import DeliveryMessage from "../models/DeliveryMessage.js";
import { protect } from "../middleware/auth.js";
import { decrementOrderInventory, InventoryUnavailableError, withInventoryTransaction } from "../utils/inventory.js";
const router = Router();
const reservationDurationMs = 10 * 60 * 1000;

function gateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

router.post("/razorpay/order", protect, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.user._id, paymentMethod: "RAZORPAY", paymentStatus: "Pending", status: "Pending" });
    if (!order) return res.status(404).json({ message: "Pending online order not found." });
    if (order.inventoryStatus === "reserved" && order.inventoryReservationExpiresAt > new Date() && order.paymentOrderId) {
      return res.json({ id: order.paymentOrderId, amount: Math.round(order.total * 100), currency: "INR", key: process.env.RAZORPAY_KEY_ID, order });
    }
    if (order.inventoryStatus !== "none") return res.status(409).json({ message: "This payment order is no longer available. Please create a new order." });
    const rp = gateway();
    if (!rp) return res.status(503).json({ message: "Razorpay is not configured. Add test keys to server/.env." });
    const paymentOrder = await rp.orders.create({ amount: Math.round(order.total * 100), currency: "INR", receipt: order.orderNumber, notes: { appOrderId: String(order._id) } });
    let response;
    try {
      await withInventoryTransaction(async session => {
        const current = await Order.findOne({
          _id: order._id,
          customer: req.user._id,
          paymentMethod: "RAZORPAY",
          paymentStatus: "Pending",
          status: "Pending"
        }).session(session);
        if (!current) throw new PaymentActionError(409, "This payment order is no longer available. Please create a new order.");
        if (current.inventoryStatus === "reserved" && current.inventoryReservationExpiresAt > new Date() && current.paymentOrderId) {
          response = { id: current.paymentOrderId, amount: Math.round(current.total * 100), currency: "INR", order: current };
          return;
        }
        if (current.inventoryStatus !== "none") throw new PaymentActionError(409, "This payment order is no longer available. Please create a new order.");

        await decrementOrderInventory(current, session);
        current.paymentOrderId = paymentOrder.id;
        current.inventoryStatus = "reserved";
        current.inventoryReservationExpiresAt = new Date(Date.now() + reservationDurationMs);
        await current.save({ session });
        response = { id: paymentOrder.id, amount: paymentOrder.amount, currency: paymentOrder.currency, order: current };
      });
    } catch (e) {
      if (e instanceof InventoryUnavailableError) return res.status(409).json({ message: e.message });
      if (e instanceof PaymentActionError) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    res.json({ ...response, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) { next(e); }
});

router.post("/razorpay/verify", protect, async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.user._id, paymentMethod: "RAZORPAY" });
    if (!order || order.paymentOrderId !== razorpay_order_id) return res.status(400).json({ message: "Payment order mismatch." });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!process.env.RAZORPAY_KEY_SECRET || expected !== razorpay_signature) return res.status(400).json({ message: "Payment signature verification failed." });
    let result;
    try {
      result = await settlePayment(order._id, razorpay_order_id, razorpay_payment_id);
    } catch (e) {
      if (e instanceof PaymentActionError) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    if (result.review) return res.status(409).json({ message: "Payment succeeded, but stock needs admin review. Contact the shop for assistance." });
    res.json({ message: "Payment verified.", order: result.order });
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
      const payment = event.payload?.payment?.entity;
      const order = await Order.findOne({ paymentOrderId: payment?.order_id, paymentMethod: "RAZORPAY" }).select("_id");
      if (order && payment?.id) await settlePayment(order._id, payment.order_id, payment.id);
    }
    res.json({ received: true });
  } catch (e) { console.error("Webhook error", e.message); res.status(400).send("Webhook processing error"); }
});

async function settlePayment(orderId, paymentOrderId, paymentId) {
  let result;
  try {
    await withInventoryTransaction(async session => {
      const order = await Order.findOne({ _id: orderId, paymentMethod: "RAZORPAY", paymentOrderId }).session(session);
      if (!order) throw new PaymentActionError(404, "Payment order not found.");
      if (order.paymentStatus === "Paid" && order.inventoryStatus === "deducted") {
        result = { order, review: false };
        return;
      }
      if (order.paymentStatus === "Paid" && order.inventoryStatus === "review") {
        result = { order, review: true };
        return;
      }
      if (order.status === "Cancelled" || order.inventoryStatus === "released") {
        order.paymentId = paymentId;
        order.paymentStatus = "Refund Pending";
        order.inventoryStatus = "review";
        order.inventoryReservationExpiresAt = undefined;
        await order.save({ session });
        result = { order, review: true };
        return;
      }

      if (order.inventoryStatus !== "reserved") await decrementOrderInventory(order, session);
      order.paymentId = paymentId;
      order.paymentStatus = "Paid";
      order.status = "Confirmed";
      order.inventoryStatus = "deducted";
      order.inventoryReservationExpiresAt = undefined;
      await order.save({ session });
      await DeliveryMessage.create([{
        order: order._id,
        customer: order.customer,
        title: "Order confirmed",
        message: `Payment received and order ${order.orderNumber} is confirmed.`
      }], { session });
      result = { order, review: false };
    });
  } catch (e) {
    if (!(e instanceof InventoryUnavailableError)) throw e;
    await withInventoryTransaction(async session => {
      const order = await Order.findOne({ _id: orderId, paymentMethod: "RAZORPAY", paymentOrderId }).session(session);
      if (!order) throw new PaymentActionError(404, "Payment order not found.");
      if (order.paymentStatus === "Paid" && order.inventoryStatus === "deducted") {
        result = { order, review: false };
        return;
      }
      order.paymentId = paymentId;
      order.paymentStatus = order.status === "Cancelled" || order.inventoryStatus === "released" ? "Refund Pending" : "Paid";
      order.inventoryStatus = "review";
      order.inventoryReservationExpiresAt = undefined;
      await order.save({ session });
      result = { order, review: true };
    });
  }
  return result;
}

class PaymentActionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export default router;
