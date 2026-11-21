"use client";
import * as React from "react";
import { ProductImage } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [i, setI] = React.useState(0);
  const current = images[i];
  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-secondary"><ProductImage src={current?.url} alt={current?.alt ?? name} /></div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Product images">
          {images.map((img, idx) => (
            <button key={img.url} type="button" role="tab" aria-selected={idx === i} aria-label={`Image ${idx + 1}`} onClick={() => setI(idx)}
              className={cn("aspect-square overflow-hidden rounded-md border-2", idx === i ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100")}>
              <ProductImage src={img.url} alt={img.alt} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
