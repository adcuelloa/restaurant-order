/**
 * Seed script: inserts 7 menu items; 2 have 3 modifier groups (Protein required 1, Toppings optional N, Sauces optional N).
 * Run: pnpm run seed (from apps/api) or pnpm --filter api run seed
 * Requires: MONGODB_URI (default: mongodb://localhost:27017/restaurant)
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/restaurant";

const proteinGroup = {
  id: "protein",
  name: "Protein",
  required: true,
  maxSelections: 1,
  options: [
    { id: "chicken", name: "Chicken", priceCents: 0 },
    { id: "beef", name: "Beef", priceCents: 200 },
    { id: "tofu", name: "Tofu", priceCents: 0 },
  ],
};

const toppingsGroup = {
  id: "toppings",
  name: "Toppings",
  required: false,
  maxSelections: 5,
  options: [
    { id: "lettuce", name: "Lettuce", priceCents: 0 },
    { id: "tomato", name: "Tomato", priceCents: 50 },
    { id: "cheese", name: "Cheese", priceCents: 100 },
    { id: "onion", name: "Onion", priceCents: 0 },
    { id: "jalapeno", name: "Jalapeño", priceCents: 50 },
  ],
};

const saucesGroup = {
  id: "sauces",
  name: "Sauces",
  required: false,
  maxSelections: 3,
  options: [
    { id: "bbq", name: "BBQ", priceCents: 0 },
    { id: "mayo", name: "Mayo", priceCents: 0 },
    { id: "ranch", name: "Ranch", priceCents: 50 },
    { id: "hot", name: "Hot Sauce", priceCents: 0 },
  ],
};

/** 7 products; 2 with 3 modifier groups per spec. */
const sampleItems = [
  { name: "Margherita Pizza", description: "Tomato, mozzarella, basil", priceCents: 1299, categoryId: "main" },
  { name: "Pepperoni Pizza", description: "Tomato, mozzarella, pepperoni", priceCents: 1499, categoryId: "main" },
  { name: "Caesar Salad", description: "Romaine, parmesan, croutons, Caesar dressing", priceCents: 899, categoryId: "main" },
  {
    name: "Custom Bowl",
    description: "Build your own: choose protein, toppings, sauces",
    priceCents: 1199,
    categoryId: "main",
    modifierGroups: [proteinGroup, toppingsGroup, saucesGroup],
  },
  {
    name: "Build Your Own Salad",
    description: "Base greens with your choice of protein, toppings, and sauces",
    priceCents: 999,
    categoryId: "main",
    modifierGroups: [proteinGroup, toppingsGroup, saucesGroup],
  },
  { name: "Iced Tea", description: "House brewed iced tea", priceCents: 349, categoryId: "drinks" },
  { name: "Lemonade", description: "Fresh squeezed lemonade", priceCents: 449, categoryId: "drinks" },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");
  const coll = db.collection("items");
  const existing = await coll.countDocuments();
  if (existing > 0) {
    console.log(`Items collection already has ${existing} document(s). Skipping seed.`);
    await mongoose.disconnect();
    return;
  }
  await coll.insertMany(sampleItems);
  console.log(`Inserted ${sampleItems.length} sample menu items (2 with 3 modifier groups).`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
