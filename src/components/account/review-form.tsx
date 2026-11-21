"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { apiFetch, attempt } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(5);
  const [busy, setBusy] = React.useState(false);
  return (
    <form className="space-y-3 rounded-lg border p-5" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      setBusy(true);
      const ok = await attempt(() => apiFetch("/api/reviews", { method: "POST", json: { productId, rating, title: fd.get("title") || undefined, body: fd.get("body") } }), "Thanks! Your review is awaiting moderation.");
      setBusy(false);
      if (ok) router.refresh();
    }}>
      <p className="font-medium">{name}</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
            <Star className={cn("h-6 w-6", n <= rating ? "fill-current" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <Field label="Title (optional)"><Input name="title" maxLength={100} /></Field>
      <Field label="Your review"><Textarea name="body" required minLength={10} maxLength={2000} /></Field>
      <Button type="submit" size="sm" loading={busy}>Submit review</Button>
    </form>
  );
}
