import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
