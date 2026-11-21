import type { Metadata } from "next";
import { getSettings } from "@/services/settings";
import { ContactForm } from "@/components/store/contact-form";

export const metadata: Metadata = { title: "Contact us" };
export const dynamic = "force-dynamic";

export default async function Contact() {
  const s = await getSettings();
  return (
    <div className="container grid max-w-4xl gap-12 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-4xl">Contact us</h1>
        <p className="mt-4 text-muted-foreground">We usually reply within one business day.</p>
        <dl className="mt-8 space-y-3 text-sm">
          <div><dt className="font-medium">Email</dt><dd className="text-muted-foreground">{s.contactEmail}</dd></div>
          {s.contactPhone && <div><dt className="font-medium">Phone</dt><dd className="text-muted-foreground">{s.contactPhone}</dd></div>}
          {s.address && <div><dt className="font-medium">Address</dt><dd className="text-muted-foreground">{s.address}</dd></div>}
        </dl>
      </div>
      <ContactForm />
    </div>
  );
}
