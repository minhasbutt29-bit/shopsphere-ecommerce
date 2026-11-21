import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "Return & refund policy" };

export default function Page() {
  return (
    <ProsePage title="Return & refund policy" updated="November 2026">
      <p><strong>Template notice:</strong> this is sample policy text. Have it reviewed before going live.</p>
      <h2>Returns</h2><p>You may return unused items in original packaging within 30 days of delivery.</p>
      <h2>Refunds</h2><p>Approved refunds are issued to the original payment method. Card refunds typically appear within 5–10 business days.</p>
      <h2>Non-returnable items</h2><p>Gift cards and items marked final sale.</p>
      <h2>How to start a return</h2><p>Contact us with your order number and we'll send return instructions.</p>
    </ProsePage>
  );
}
