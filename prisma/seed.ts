/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: skipping admin creation.");
    return;
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    create: { email, name: process.env.SEED_ADMIN_NAME ?? "Store Admin", passwordHash, role: "ADMIN", emailVerified: new Date() },
    update: { role: "ADMIN", passwordHash, isActive: true },
  });
  console.log(`Admin ready: ${email}`);
}

async function seedDemo() {
  await db.storeSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", lowStockEmail: null }, update: {} });

  const cats = ["Apparel", "Footwear", "Accessories", "Home & Living"];
  const catIds: Record<string, string> = {};
  for (const [i, name] of cats.entries()) {
    const c = await db.category.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), sortOrder: i, description: `${name} curated for everyday life.` }, update: {} });
    catIds[name] = c.id;
  }

  const products: { name: string; sku: string; cat: string; brand: string; price: number; sale?: number; stock: number; featured?: boolean; sold: number; desc: string; variants?: { size?: string; color?: string; stock: number }[] }[] = [
    { name: "Merino Crew Sweater", sku: "APP-001", cat: "Apparel", brand: "Northline", price: 128, sale: 99, stock: 40, featured: true, sold: 120, desc: "Fine-gauge merino wool crew neck with a relaxed drop shoulder. Naturally temperature regulating and machine washable.", variants: [{ size: "S", color: "Charcoal", stock: 10 }, { size: "M", color: "Charcoal", stock: 15 }, { size: "L", color: "Charcoal", stock: 15 }] },
    { name: "Heavyweight Cotton Tee", sku: "APP-002", cat: "Apparel", brand: "Northline", price: 42, stock: 120, sold: 310, desc: "A 280gsm organic cotton tee that keeps its shape wash after wash." },
    { name: "Waxed Field Jacket", sku: "APP-003", cat: "Apparel", brand: "Alder & Co", price: 245, stock: 18, featured: true, sold: 64, desc: "Water-resistant waxed cotton jacket with corduroy collar and four utility pockets." },
    { name: "Tapered Selvedge Denim", sku: "APP-004", cat: "Apparel", brand: "Alder & Co", price: 165, sale: 139, stock: 3, sold: 98, desc: "14oz Japanese selvedge denim with a tapered leg. Rinse-washed for a soft first wear." },
    { name: "Court Leather Sneaker", sku: "FTW-001", cat: "Footwear", brand: "Marlow", price: 148, stock: 55, featured: true, sold: 210, desc: "Minimal full-grain leather sneaker on a cushioned, stitched cupsole.", variants: [{ size: "41", stock: 10 }, { size: "42", stock: 20 }, { size: "43", stock: 15 }, { size: "44", stock: 10 }] },
    { name: "Trail Runner GT", sku: "FTW-002", cat: "Footwear", brand: "Marlow", price: 134, sale: 112, stock: 35, sold: 142, desc: "Lightweight trail shoe with a grippy outsole and breathable engineered mesh." },
    { name: "Suede Chelsea Boot", sku: "FTW-003", cat: "Footwear", brand: "Alder & Co", price: 210, stock: 22, sold: 51, desc: "Hand-finished suede Chelsea boot with a Goodyear-welted leather sole." },
    { name: "Leather Card Holder", sku: "ACC-001", cat: "Accessories", brand: "Marlow", price: 55, stock: 80, featured: true, sold: 190, desc: "Vegetable-tanned leather card holder that develops a rich patina." },
    { name: "Canvas Weekender Bag", sku: "ACC-002", cat: "Accessories", brand: "Northline", price: 189, sale: 159, stock: 14, sold: 77, desc: "Water-repellent canvas weekender with leather trims and a detachable shoulder strap." },
    { name: "Merino Beanie", sku: "ACC-003", cat: "Accessories", brand: "Northline", price: 38, stock: 95, sold: 260, desc: "Ribbed merino beanie. Soft, warm and itch-free." },
    { name: "Stoneware Mug Set (4)", sku: "HOM-001", cat: "Home & Living", brand: "Fieldhouse", price: 64, stock: 45, featured: true, sold: 133, desc: "Four hand-glazed stoneware mugs, dishwasher and microwave safe." },
    { name: "Linen Throw Blanket", sku: "HOM-002", cat: "Home & Living", brand: "Fieldhouse", price: 118, sale: 94, stock: 4, sold: 88, desc: "Stonewashed European linen throw. Gets softer with every wash." },
  ];

  for (const p of products) {
    const existing = await db.product.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: p.name, slug: slug(p.name), sku: p.sku, description: p.desc, brand: p.brand, categoryId: catIds[p.cat],
          priceCents: p.price * 100, salePriceCents: p.sale ? p.sale * 100 : null,
          stock: p.variants ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
          isPublished: true, isFeatured: !!p.featured, soldCount: p.sold,
        },
      });
      if (p.variants) {
        for (const [i, v] of p.variants.entries()) {
          await tx.productVariant.create({ data: { productId: created.id, sku: `${p.sku}-${i + 1}`, size: v.size, color: v.color, stock: v.stock } });
        }
      }
      await tx.inventoryMovement.create({ data: { productId: created.id, type: "INITIAL", change: created.stock, stockAfter: created.stock, note: "Seed data" } });
    });
  }

  const coupons = [
    { code: "WELCOME10", type: "PERCENTAGE" as const, value: 10, minSubtotalCents: 0, perUserLimit: 1 },
    { code: "SAVE20", type: "FIXED" as const, value: 2000, minSubtotalCents: 10000, perUserLimit: 3 },
  ];
  for (const c of coupons) await db.coupon.upsert({ where: { code: c.code }, create: c, update: {} });

  await db.banner.count().then(async (n) => {
    if (n === 0) {
      await db.banner.create({ data: { title: "Free shipping over $100", subtitle: "Complimentary standard delivery on every qualifying order.", image: "/banner-placeholder", ctaLabel: "Shop now", ctaHref: "/shop", position: 0 } });
    }
  });

  if (process.env.SEED_DEMO_DATA === "true") {
    const demoEmail = "customer@example.com";
    await db.user.upsert({
      where: { email: demoEmail },
      create: { email: demoEmail, name: "Demo Customer", passwordHash: await bcrypt.hash("DemoCustomer123", 12), emailVerified: new Date(), role: "CUSTOMER" },
      update: {},
    });
    console.log(`Demo customer: ${demoEmail} / DemoCustomer123 (demo only: do not use in production)`);
  }
}

async function main() {
  await seedAdmin();
  await seedDemo();
  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
