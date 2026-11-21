import type { Metadata } from "next";
import { CompareView } from "@/components/store/compare-view";

export const metadata: Metadata = { title: "Compare products" };

export default function ComparePage() {
  return (
    <div className="container py-10">
      <h1 className="text-4xl">Compare products</h1>
      <CompareView />
    </div>
  );
}
