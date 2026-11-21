import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container py-10">
      <Skeleton className="h-10 w-48" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3"><Skeleton className="aspect-[4/5]" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/3" /></div>
        ))}
      </div>
    </div>
  );
}
