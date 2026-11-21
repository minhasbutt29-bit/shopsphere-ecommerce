import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "ShopSphere: Considered essentials", template: "%s | ShopSphere" },
  description: "Premium apparel, footwear, accessories and home goods, thoughtfully made and delivered fast.",
  openGraph: { type: "website", siteName: "ShopSphere", title: "ShopSphere: Considered essentials", description: "Premium apparel, footwear, accessories and home goods.", url: base },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
