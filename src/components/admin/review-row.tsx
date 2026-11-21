"use client";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/confirm";
import { apiFetch, attempt } from "@/lib/client-api";

export function ReviewRow({ id, status, rating, title, body, product, author }: { id: string; status: string; rating: number; title: string | null; body: string; product: string; author: string }) {
  const router = useRouter();
  const set = async (s: "APPROVED" | "REJECTED") => { await attempt(() => apiFetch(`/api/admin/reviews/${id}`, { method: "PATCH", json: { status: s } }), s === "APPROVED" ? "Review approved" : "Review rejected"); router.refresh(); };
  return (
    <div className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className="flex items-center gap-2"><span className="font-medium">{product}</span><StatusBadge status={status} /></p>
        <p className="flex gap-0.5" aria-label={`${rating} out of 5`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-current" : "text-muted-foreground/40"}`} aria-hidden />)}</p>
        {title && <p className="font-medium">{title}</p>}
        <p className="text-muted-foreground">{body}</p>
        <p className="text-xs text-muted-foreground">by {author}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {status !== "APPROVED" && <Button size="sm" onClick={() => set("APPROVED")}>Approve</Button>}
        {status !== "REJECTED" && <Button size="sm" variant="outline" onClick={() => set("REJECTED")}>Reject</Button>}
        <ConfirmButton title="Delete this review?" confirmLabel="Delete" onConfirm={async () => { await attempt(() => apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" }), "Review deleted"); router.refresh(); }}>Delete</ConfirmButton>
      </div>
    </div>
  );
}
