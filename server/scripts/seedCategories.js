import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../src/models/Category.js";
dotenv.config();
const defaults = {
  Women: ["Sarees", "Kurtis & Kurtas", "Tops", "T-shirts", "Shirts", "Jeans & Trousers", "Dresses", "Salwar Suits & Ethnic Wear", "Skirts", "Jackets & Hoodies"],
  Men: ["T-shirts", "Shirts", "Jeans", "Trousers", "Shorts", "Kurtas & Ethnic Wear", "Jackets", "Hoodies & Sweatshirts", "Track Pants"]
};
const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
try {
  await mongoose.connect(process.env.MONGODB_URI);
  let created = 0;
  for (const [gender, names] of Object.entries(defaults)) {
    for (const name of names) {
      const slug = slugify(name);
      const result = await Category.updateOne({ gender, slug }, { $setOnInsert: { gender, name, slug, isActive: true } }, { upsert: true });
      if (result.upsertedCount) created++;
    }
  }
  console.log(`Default categories ready. Newly added: ${created}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
