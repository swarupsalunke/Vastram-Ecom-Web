import mongoose from "mongoose";
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  gender: { type: String, enum: ["Men", "Women"], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  categoryName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: 0, min: 0 },
  images: [{ type: String }],
  colors: [{ type: String }],
  sizes: [{ size: String, stock: { type: Number, min: 0, default: 0 } }],
  isActive: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }
}, { timestamps: true });
productSchema.index({ gender: 1, category: 1, price: 1, isActive: 1 });
export default mongoose.model("Product", productSchema);
