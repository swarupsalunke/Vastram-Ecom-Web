import mongoose from "mongoose";
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  gender: { type: String, enum: ["Men", "Women"], required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
categorySchema.index({ gender: 1, slug: 1 }, { unique: true });
export default mongoose.model("Category", categorySchema);
