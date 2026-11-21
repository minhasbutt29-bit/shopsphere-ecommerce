"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ProductImage } from "@/components/ui/misc";
import { apiFetch, attempt } from "@/lib/client-api";

type Img = { id: string; url: string; alt: string | null };
type Variant = { id: string; sku: string; size: string | null; color: string | null; stock: number };

export function ProductMedia({ productId, images, variants }: { productId: string; images: Img[]; variants: Variant[] }) {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="space-y-10">
      <section aria-labelledby="img-h">
        <h2 id="img-h" className="mb-3 text-xl">Images</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((i) => (
            <div key={i.id} className="group relative aspect-square overflow-hidden rounded-md bg-secondary">
              <ProductImage src={i.url} alt={i.alt ?? "Product image"} />
              <button type="button" aria-label="Delete image" className="absolute right-1 top-1 rounded-full bg-background p-1.5 shadow" onClick={async () => { await attempt(() => apiFetch(`/api/admin/products/${productId}/images`, { method: "DELETE", json: { imageId: i.id } }), "Image removed"); router.refresh(); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <label className="mt-3 inline-block">
          <span className="sr-only">Upload image</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="text-sm" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const fd = new FormData(); fd.set("file", file);
              const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: fd });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Upload failed");
              toast.success("Image uploaded"); router.refresh();
            } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
            finally { setUploading(false); e.target.value = ""; }
          }} />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP up to 5MB. Requires Cloudinary credentials.</p>
      </section>

      <section aria-labelledby="var-h">
        <h2 id="var-h" className="mb-3 text-xl">Variants</h2>
        {variants.length > 0 && (
          <table className="mb-4 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-2">SKU</th><th>Size</th><th>Color</th><th className="text-right">Stock</th><th /></tr></thead>
            <tbody className="divide-y">{variants.map((v) => (
              <tr key={v.id}><td className="py-2">{v.sku}</td><td>{v.size ?? "–"}</td><td>{v.color ?? "–"}</td><td className="text-right">{v.stock}</td>
                <td className="text-right"><Button variant="ghost" size="icon" aria-label={`Delete variant ${v.sku}`} onClick={async () => { await attempt(() => apiFetch(`/api/admin/products/${productId}/variants`, { method: "DELETE", json: { variantId: v.id } }), "Variant removed"); router.refresh(); }}><Trash2 className="h-4 w-4" /></Button></td></tr>
            ))}</tbody></table>
        )}
        <form className="grid gap-3 sm:grid-cols-5" onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget; const fd = new FormData(form);
          setBusy(true);
          const ok = await attempt(() => apiFetch(`/api/admin/products/${productId}/variants`, { method: "POST", json: { sku: fd.get("sku"), size: fd.get("size"), color: fd.get("color"), price: fd.get("price") || "", stock: fd.get("stock") } }), "Variant added");
          setBusy(false);
          if (ok) { form.reset(); router.refresh(); }
        }}>
          <Field label="SKU"><Input name="sku" required /></Field><Field label="Size"><Input name="size" /></Field><Field label="Color"><Input name="color" /></Field>
          <Field label="Stock"><Input name="stock" type="number" min="0" defaultValue={0} required /></Field>
          <div className="flex items-end"><Button type="submit" loading={busy} className="w-full">Add variant</Button></div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">When a product has variants, shoppers must pick one, and stock is tracked per variant.</p>
      </section>
    </div>
  );
}
