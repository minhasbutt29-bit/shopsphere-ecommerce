import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { ProductForm } from "@/components/admin/product-form";
import { ProductMedia } from "@/components/admin/product-media";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { id: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-3xl">Edit “{product.name}”</h1>
      <ProductForm
        categories={categories}
        product={{ id: product.id, name: product.name, sku: product.sku, description: product.description, brand: product.brand ?? "", price: product.priceCents / 100, salePrice: product.salePriceCents ? product.salePriceCents / 100 : null, stock: product.stock, lowStockAt: product.lowStockAt, categoryId: product.categoryId ?? "", isPublished: product.isPublished, isFeatured: product.isFeatured }}
      />
      <ProductMedia productId={product.id} images={product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))} variants={product.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, stock: v.stock }))} />
    </div>
  );
}
