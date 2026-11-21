"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm";
import { apiFetch, attempt } from "@/lib/client-api";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  return (
    <ConfirmButton title="Cancel this order?" description="Items return to stock and this can't be undone." confirmLabel="Cancel order" variant="destructive"
      onConfirm={async () => { await attempt(() => apiFetch(`/api/orders/${orderId}`, { method: "DELETE" }), "Order cancelled"); router.refresh(); }}>
      Cancel order
    </ConfirmButton>
  );
}
