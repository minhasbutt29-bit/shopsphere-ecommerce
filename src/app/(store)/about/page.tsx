import type { Metadata } from "next";
import { ProsePage } from "@/components/store/prose-page";

export const metadata: Metadata = { title: "About us", description: "The story behind ShopSphere." };

export default function About() {
  return (
    <ProsePage title="About ShopSphere">
      <p>ShopSphere is a considered take on everyday shopping: fewer, better things, made from honest materials and delivered without fuss.</p>
      <h2>Our approach</h2>
      <ul>
        <li><strong>Quality first.</strong> Every product is tested for durability before it reaches the catalogue.</li>
        <li><strong>Fair pricing.</strong> We keep margins transparent and never inflate "original" prices.</li>
        <li><strong>Responsible sourcing.</strong> We work with suppliers who share our standards for materials and labour.</li>
      </ul>
      <p>Questions? Reach us through the contact page. We reply within one business day.</p>
    </ProsePage>
  );
}
