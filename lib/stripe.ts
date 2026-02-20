import "server-only";
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  if (!stripe) {
    stripe = new Stripe(secret);
  }
  return stripe;
}
