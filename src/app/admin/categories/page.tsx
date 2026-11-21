import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } }, parent: { select: { name: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Categories</h1>
      <CategoryManager categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description, image: c.image, parentId: c.parentId, parentName: c.parent?.name ?? null, sortOrder: c.sortOrder, products: c._count.products }))} />
    </div>
  );
}
