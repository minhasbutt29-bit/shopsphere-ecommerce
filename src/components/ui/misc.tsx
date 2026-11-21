import * as React from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...p} />
);

export function Badge({ className, tone = "neutral", ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-muted text-foreground",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...p} />;
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <PackageOpen className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const statusTone: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning", CONFIRMED: "info", PROCESSING: "info", SHIPPED: "info", DELIVERED: "success", CANCELLED: "danger", REFUNDED: "neutral",
  PAID: "success", FAILED: "danger", APPROVED: "success", REJECTED: "danger",
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTone[status] ?? "neutral"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;

export function ProductImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={alt} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-secondary font-display text-4xl text-muted-foreground", className)} role="img" aria-label={alt}>
      {alt.charAt(0).toUpperCase()}
    </div>
  );
}
