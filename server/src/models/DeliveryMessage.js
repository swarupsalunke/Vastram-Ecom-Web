import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  readAt: Date
}, { timestamps: true });
export default mongoose.model("DeliveryMessage", messageSchema);
