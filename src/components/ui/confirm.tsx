"use client";
import * as React from "react";
import { Button } from "./button";

/** Accessible native <dialog>-based confirmation. */
export function ConfirmButton({
  onConfirm, title, description, children, variant = "destructive", size = "sm", confirmLabel = "Confirm",
}: {
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "destructive" | "outline" | "default";
  size?: "sm" | "default";
  confirmLabel?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant === "destructive" ? "outline" : variant} size={size} onClick={() => ref.current?.showModal()}>{children}</Button>
      <dialog ref={ref} className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground backdrop:bg-black/50" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="text-lg font-medium">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>Cancel</Button>
          <Button type="button" variant={variant === "destructive" ? "destructive" : "default"} loading={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); ref.current?.close(); } }}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
