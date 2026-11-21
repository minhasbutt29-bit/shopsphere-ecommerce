"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm";
import { apiFetch, attempt } from "@/lib/client-api";

export function CustomerActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  return (
    <ConfirmButton variant={isActive ? "destructive" : "default"} size="default" title={isActive ? "Deactivate this account?" : "Reactivate this account?"}
      description={isActive ? "The customer will no longer be able to sign in or use their account." : "The customer will be able to sign in again."}
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      onConfirm={async () => { await attempt(() => apiFetch(`/api/admin/customers/${id}`, { method: "PATCH", json: { isActive: !isActive } }), isActive ? "Account deactivated" : "Account reactivated"); router.refresh(); }}>
      {isActive ? "Deactivate account" : "Reactivate account"}
    </ConfirmButton>
  );
}
