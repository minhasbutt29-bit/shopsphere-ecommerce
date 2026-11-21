import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "Shipping policy" };

export default function Page() {
  return (
    <ProsePage title="Shipping policy" updated="November 2026">
      <p><strong>Template notice:</strong> this is sample policy text. Have it reviewed against your local laws and your actual operations before going live.</p>
      <h2>Processing time</h2><p>Orders are processed within 1–2 business days.</p>
      <h2>Delivery options</h2>
      <ul><li>Standard: 3–5 business days. Free above the store's free-shipping threshold.</li><li>Express: 1–2 business days at a flat rate.</li></ul>
      <h2>Tracking</h2><p>Once your order ships, the tracking number appears in My account → Orders and in your email.</p>
      <h2>Delivery issues</h2><p>If a parcel is lost or damaged, contact us within 14 days of the estimated delivery date.</p>
    </ProsePage>
  );
}
