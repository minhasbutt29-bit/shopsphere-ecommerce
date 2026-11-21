"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm";
import { apiFetch, attempt } from "@/lib/client-api";
import { canTransition } from "@/services/pricing";

type S = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
const ALL: S[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export function OrderStatusForm({ orderId, status, paid, trackingNumber, carrier }: { orderId: string; status: S; paid: boolean; trackingNumber: string; carrier: string }) {
  const router = useRouter();
  const options = ALL.filter((s) => canTransition(status, s) && !(s === "CANCELLED" && paid) && !(s === "REFUNDED" && !paid));
  const [next, setNext] = React.useState<S | "">(options[0] ?? "");
  const [tracking, setTracking] = React.useState(trackingNumber);
  const [car, setCar] = React.useState(carrier);
  const [busy, setBusy] = React.useState(false);

  if (options.length === 0) return <p className="text-sm text-muted-foreground">No further status changes are possible.</p>;

  const submit = async () => {
    if (!next) return;
    setBusy(true);
    await attempt(() => apiFetch(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { status: next, trackingNumber: tracking || undefined, carrier: car || undefined } }), `Order marked ${next.toLowerCase()}`);
    setBusy(false);
    router.refresh();
  };
  const destructive = next === "CANCELLED" || next === "REFUNDED";

  return (
    <div className="space-y-3">
      <Field label="New status"><Select value={next} onChange={(e) => setNext(e.target.value as S)}>{options.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}</Select></Field>
      {next === "SHIPPED" && <><Field label="Carrier"><Input value={car} onChange={(e) => setCar(e.target.value)} /></Field><Field label="Tracking number"><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field></>}
      {destructive
        ? <ConfirmButton variant="destructive" title={next === "REFUNDED" ? "Refund this order?" : "Cancel this order?"} description={next === "REFUNDED" ? "The payment is refunded and stock is returned. This cannot be undone." : "Stock is returned and the coupon redemption is released."} confirmLabel={next === "REFUNDED" ? "Refund" : "Cancel order"} size="default" onConfirm={submit}>{next === "REFUNDED" ? "Refund order" : "Cancel order"}</ConfirmButton>
        : <Button onClick={submit} loading={busy} className="w-full">Update status</Button>}
    </div>
  );
}
