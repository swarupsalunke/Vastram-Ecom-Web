import mongoose from "mongoose";
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  image: String,
  gender: String,
  categoryName: String,
  size: String,
  color: String,
  quantity: { type: Number, min: 1 },
  unitPrice: { type: Number, min: 0 }
}, { _id: false });
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [orderItemSchema],
  shippingAddress: { fullName: String, phone: String, line1: String, line2: String, city: String, state: String, postalCode: String },
  subtotal: Number,
  discount: { type: Number, default: 0 },
  total: Number,
  couponCode: String,
  paymentMethod: { type: String, enum: ["COD", "RAZORPAY"], required: true },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refund Pending", "Refunded"], default: "Pending" },
  paymentOrderId: String,
  paymentId: String,
  status: { type: String, enum: ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"], default: "Pending" },
  cancellationReason: String,
  deliveryMessage: String,
  cancelledAt: Date
}, { timestamps: true });
export default mongoose.model("Order", orderSchema);
