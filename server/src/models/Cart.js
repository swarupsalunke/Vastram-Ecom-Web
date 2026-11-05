import mongoose from "mongoose";
const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true },
  color: { type: String, default: "" },
  quantity: { type: Number, min: 1, max: 20, required: true }
}, { _id: false });
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  items: [cartItemSchema]
}, { timestamps: true });
export default mongoose.model("Cart", cartSchema);
