"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { apiFetch, attempt } from "@/lib/client-api";

export function ProductRowActions({ id, name, isPublished, isFeatured }: { id: string; name: string; isPublished: boolean; isFeatured: boolean }) {
  const router = useRouter();
  const toggle = async (patch: { isPublished?: boolean; isFeatured?: boolean }, msg: string) => {
    await attempt(() => apiFetch(`/api/admin/products/${id}`, { method: "PATCH", json: patch }), msg);
    router.refresh();
  };
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={isPublished ? `Unpublish ${name}` : `Publish ${name}`} onClick={() => toggle({ isPublished: !isPublished }, isPublished ? "Unpublished" : "Published")}>{isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
      <Button variant="ghost" size="icon" aria-label={isFeatured ? `Unfeature ${name}` : `Feature ${name}`} aria-pressed={isFeatured} onClick={() => toggle({ isFeatured: !isFeatured }, isFeatured ? "Removed from featured" : "Marked as featured")}><Star className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`} /></Button>
      <Button asChild variant="ghost" size="icon"><Link href={`/admin/products/${id}`} aria-label={`Edit ${name}`}><Pencil className="h-4 w-4" /></Link></Button>
      <ConfirmButton title={`Delete “${name}”?`} description="This permanently removes the product. Existing orders keep their item snapshots." confirmLabel="Delete"
        onConfirm={async () => { await attempt(() => apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }), "Product deleted"); router.refresh(); }}>Delete</ConfirmButton>
    </div>
  );
}
