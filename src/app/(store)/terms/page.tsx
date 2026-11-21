import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function Page() {
  return (
    <ProsePage title="Terms & conditions" updated="November 2026">
      <p><strong>Template notice:</strong> this is sample text and not legal advice. Have it reviewed before going live.</p>
      <h2>Orders</h2><p>All orders are subject to availability and acceptance. Prices are shown in the store currency and may change without notice.</p>
      <h2>Accounts</h2><p>You are responsible for keeping your credentials confidential and for activity under your account.</p>
      <h2>Liability</h2><p>To the extent permitted by law, our liability is limited to the value of the order concerned.</p>
    </ProsePage>
  );
}
