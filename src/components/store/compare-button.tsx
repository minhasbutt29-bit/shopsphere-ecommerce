"use client";
import * as React from "react";
import { GitCompare } from "lucide-react";
import { toast } from "sonner";

const KEY = "shopsphere:compare";
export const readCompare = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};
export const writeCompare = (ids: string[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 4))); } catch { /* storage unavailable */ }
};

/** Compare list is a per-browser convenience (not account data), so localStorage is appropriate here. */
export function CompareButton({ productId }: { productId: string }) {
  return (
    <button
      type="button"
      aria-label="Add to compare"
      onClick={(e) => {
        e.preventDefault();
        const ids = readCompare();
        if (ids.includes(productId)) return toast.info("Already in compare list");
        if (ids.length >= 4) return toast.error("You can compare up to 4 products");
        writeCompare([...ids, productId]);
        toast.success(`Added to compare (${ids.length + 1}/4)`, { action: { label: "View", onClick: () => (window.location.href = "/compare") } });
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm transition hover:scale-105"
    ><GitCompare className="h-4 w-4" /></button>
  );
}
