import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("replace_me"));
}

export function getStripe(): Stripe {
  if (!stripeConfigured()) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}
