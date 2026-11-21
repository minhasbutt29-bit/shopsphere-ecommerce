import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <ProsePage title="Privacy policy" updated="November 2026">
      <p><strong>Template notice:</strong> this is sample policy text and not legal advice. Have it reviewed by a qualified professional before going live.</p>
      <h2>What we collect</h2><p>Account details, shipping and billing addresses, order history and basic usage data needed to operate the store.</p>
      <h2>Payments</h2><p>Card details are entered on Stripe's hosted page and never reach or are stored on our servers.</p>
      <h2>How we use data</h2><p>To fulfil orders, provide support, prevent fraud and, if you opt in, send marketing email.</p>
      <h2>Your rights</h2><p>You can update your details and email preferences in your account, and contact us to request deletion.</p>
    </ProsePage>
  );
}
