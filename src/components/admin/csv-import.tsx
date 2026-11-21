"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CsvImport() {
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <input ref={ref} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV file" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
          const fd = new FormData(); fd.set("file", file);
          const res = await fetch("/api/admin/products/import", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Import failed");
          toast.success(`Imported: ${data.created} created, ${data.updated} updated`);
          if (data.errors?.length) toast.error(`${data.errors.length} rows failed. First: row ${data.errors[0].row}: ${data.errors[0].error}`);
          router.refresh();
        } catch (err) { toast.error(err instanceof Error ? err.message : "Import failed"); }
        finally { setBusy(false); e.target.value = ""; }
      }} />
      <Button variant="outline" loading={busy} onClick={() => ref.current?.click()} title="Columns: name,sku,description,brand,price,salePrice,stock,category,isPublished"><Upload className="h-4 w-4" /> Import CSV</Button>
    </>
  );
}
