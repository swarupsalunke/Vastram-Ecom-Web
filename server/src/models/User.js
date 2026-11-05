import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  phone: { type: String, default: "" },
  addresses: [{ fullName: String, phone: String, line1: String, line2: String, city: String, state: String, postalCode: String, isDefault: Boolean }]
}, { timestamps: true });
export default mongoose.model("User", userSchema);
