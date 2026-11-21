"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type P = { id: string; name: string; sku: string; description: string; brand: string; price: number; salePrice: number | null; stock: number; lowStockAt: number; categoryId: string; isPublished: boolean; isFeatured: boolean };

export function ProductForm({ categories, product }: { categories: { id: string; name: string }[]; product?: P }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const err = (k: string) => errors[k]?.[0];

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const body = {
        name: fd.get("name"), sku: fd.get("sku"), description: fd.get("description"), brand: fd.get("brand"),
        price: fd.get("price"), salePrice: fd.get("salePrice") || "", stock: fd.get("stock") ?? 0, lowStockAt: fd.get("lowStockAt"),
        categoryId: fd.get("categoryId"), isPublished: fd.get("isPublished") === "on", isFeatured: fd.get("isFeatured") === "on",
      };
      setBusy(true); setErrors({});
      try {
        const r = await apiFetch<{ product: { id: string } }>(product ? `/api/admin/products/${product.id}` : "/api/admin/products", { method: product ? "PUT" : "POST", json: body });
        const { toast } = await import("sonner");
        toast.success(product ? "Product updated" : "Product created");
        router.push(product ? "/admin/products" : `/admin/products/${r.product.id}`);
        router.refresh();
      } catch (ex) {
        const { toast } = await import("sonner");
        const d = (ex as { details?: Record<string, string[]> }).details;
        if (d) setErrors(d);
        toast.error(ex instanceof Error ? ex.message : "Failed");
      } finally { setBusy(false); }
    }}>
      <div className="sm:col-span-2"><Field label="Name" error={err("name")}><Input name="name" required defaultValue={product?.name} /></Field></div>
      <Field label="SKU" error={err("sku")}><Input name="sku" required defaultValue={product?.sku} /></Field>
      <Field label="Brand"><Input name="brand" defaultValue={product?.brand} /></Field>
      <Field label="Price (USD)" error={err("price")}><Input name="price" type="number" step="0.01" min="0.01" required defaultValue={product?.price} /></Field>
      <Field label="Sale price (optional)" error={err("salePrice")}><Input name="salePrice" type="number" step="0.01" min="0.01" defaultValue={product?.salePrice ?? ""} /></Field>
      {product ? (
        <Field label="Stock" hint="Change stock on the Inventory page so every change is logged."><Input value={product.stock} disabled readOnly /></Field>
      ) : (
        <Field label="Initial stock" error={err("stock")}><Input name="stock" type="number" min="0" defaultValue={0} required /></Field>
      )}
      <Field label="Low-stock alert at"><Input name="lowStockAt" type="number" min="0" defaultValue={product?.lowStockAt ?? 5} /></Field>
      <div className="sm:col-span-2"><Field label="Category"><Select name="categoryId" defaultValue={product?.categoryId ?? ""}><option value="">Uncategorised</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field></div>
      <div className="sm:col-span-2"><Field label="Description" error={err("description")}><Textarea name="description" required rows={6} defaultValue={product?.description} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={product?.isPublished} /> Published</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} /> Featured on homepage</label>
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>{product ? "Save changes" : "Create product"}</Button></div>
    </form>
  );
}
