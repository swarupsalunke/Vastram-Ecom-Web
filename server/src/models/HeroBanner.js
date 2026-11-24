import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema({
  key: { type: String, default: "home", unique: true },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: images => images.length <= 10,
      message: "A maximum of 10 hero banner images is allowed."
    }
  }
}, { timestamps: true });

export default mongoose.model("HeroBanner", heroBannerSchema);
