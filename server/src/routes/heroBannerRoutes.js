import { Router } from "express";
import HeroBanner from "../models/HeroBanner.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const banner = await HeroBanner.findOne({ key: "home" }).lean();
    res.json({ images: banner?.images || [] });
  } catch (error) {
    next(error);
  }
});

router.put("/", protect, adminOnly, async (req, res, next) => {
  try {
    const images = req.body?.images;
    if (!Array.isArray(images) || images.length > 10 || images.some(image => typeof image !== "string" || !image.trim())) {
      return res.status(400).json({ message: "Choose up to 10 valid banner images." });
    }

    const banner = await HeroBanner.findOneAndUpdate(
      { key: "home" },
      { $set: { images: images.map(image => image.trim()) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ images: banner.images });
  } catch (error) {
    next(error);
  }
});

export default router;
