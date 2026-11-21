"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, ProductImage } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/confirm";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";

type Cat = { id: string; name: string; description: string | null; image: string | null; parentId: string | null; parentName: string | null; sortOrder: number; products: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Cat | null>(null);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories", { method: editing ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(editing ? "Category updated" : "Category created");
      setEditing(null); formRef.current?.reset(); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Category</th><th className="p-3">Parent</th><th className="p-3 text-right">Order</th><th className="p-3 text-right">Products</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="p-3"><div className="flex items-center gap-3"><div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-secondary"><ProductImage src={c.image} alt={c.name} className="text-sm" /></div>{c.name}</div></td>
                <td className="p-3 text-muted-foreground">{c.parentName ?? "–"}</td><td className="p-3 text-right">{c.sortOrder}</td><td className="p-3 text-right">{c.products}</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                  <ConfirmButton title={`Delete “${c.name}”?`} description="Products in this category become uncategorised." confirmLabel="Delete" onConfirm={async () => { await attempt(() => apiFetch(`/api/admin/categories/${c.id}`, { method: "DELETE" }), "Category deleted"); router.refresh(); }}><Trash2 className="h-4 w-4" aria-label={`Delete ${c.name}`} /></ConfirmButton>
                </div></td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No categories yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="h-fit p-5">
        <h2 className="mb-4 text-lg">{editing ? `Edit “${editing.name}”` : "New category"}</h2>
        <form key={editing?.id ?? "new"} ref={formRef} onSubmit={submit} className="space-y-3">
          <Field label="Name"><Input name="name" required defaultValue={editing?.name} /></Field>
          <Field label="Description"><Textarea name="description" rows={3} defaultValue={editing?.description ?? ""} /></Field>
          <Field label="Parent category"><Select name="parentId" defaultValue={editing?.parentId ?? ""}><option value="">None (top level)</option>{categories.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Display order"><Input name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} /></Field>
          <Field label="Image" hint="JPEG, PNG or WebP up to 5MB (Cloudinary)."><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
          <div className="flex gap-2"><Button type="submit" loading={busy}>{editing ? "Save" : "Create"}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>}</div>
        </form>
      </Card>
    </div>
  );
}
