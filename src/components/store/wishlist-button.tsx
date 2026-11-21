"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, apiFetch } from "@/lib/client-api";
import { toast } from "sonner";

export function WishlistButton({ productId, initial = false, className }: { productId: string; initial?: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await apiFetch<{ wishlisted: boolean }>("/api/wishlist", { method: "POST", json: { productId } });
          setOn(r.wishlisted);
          toast.success(r.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
          router.refresh();
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
          else toast.error(err instanceof Error ? err.message : "Failed");
        } finally { setBusy(false); }
      }}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm transition hover:scale-105", className)}
    >
      <Heart className={cn("h-4 w-4", on && "fill-accent text-accent")} />
    </button>
  );
}
