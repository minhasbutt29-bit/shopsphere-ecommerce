import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "FAQ" };

const faqs = [
  ["How long does delivery take?", "Standard delivery takes 3–5 business days and express takes 1–2 business days."],
  ["Is shipping free?", "Standard shipping is free on orders above the free-shipping threshold shown in your cart."],
  ["Which payment methods do you accept?", "Credit and debit cards (processed securely by Stripe) and cash on delivery."],
  ["Can I cancel my order?", "Yes, before it enters processing. Go to My account → Orders and choose Cancel."],
  ["How do returns work?", "Items can be returned within 30 days in original condition. See our returns policy."],
  ["How do I track my order?", "Sign in and open My account → Orders to see live status and tracking details."],
];

export default function FAQ() {
  return (
    <ProsePage title="Frequently asked questions">
      {faqs.map(([q, a]) => (
        <details key={q} className="rounded-md border p-4 [&_summary]:cursor-pointer [&_summary]:font-medium [&_summary]:text-foreground">
          <summary>{q}</summary>
          <p className="mt-2">{a}</p>
        </details>
      ))}
    </ProsePage>
  );
}
