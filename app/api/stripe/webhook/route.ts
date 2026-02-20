import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Local testing: run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
// and set STRIPE_WEBHOOK_SECRET in .env.local to the whsec_... value shown. Restart dev server.

export async function POST(req: Request) {
  console.log("[webhook] POST received");

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("[webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

  const rawBody = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  console.log("[webhook] event.type:", event.type);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as import("stripe").Stripe.Checkout.Session;
  console.log("[webhook] session.id:", session.id, "session.metadata:", session.metadata);
  const submissionId =
    session.metadata?.submission_id ?? session.metadata?.submissionId ?? null;
  const supabaseUserId =
    session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
  console.log("[webhook] submissionId:", submissionId, "supabase_user_id:", supabaseUserId);
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission_id in metadata" }, { status: 400 });
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: "APP_URL not configured" }, { status: 500 });

  const sb = supabaseAdmin;

  const { data: sub, error: subErr } = await sb
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    console.error("[webhook] Submission not found. submissionId:", submissionId, "subErr:", subErr);
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (sub.status === "processing" || sub.status === "complete") {
    return NextResponse.json({ received: true });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const submissionUpdate: Record<string, string | null> = {
    status: "processing",
    stripe_session_id: session.id,
  };
  if (supabaseUserId) submissionUpdate.user_id = supabaseUserId;

  const { error: updateErr } = await sb
    .from("submissions")
    .update(submissionUpdate)
    .eq("id", submissionId);

  if (updateErr) {
    console.error("[webhook] Supabase updateErr (status/stripe_session_id):", JSON.stringify(updateErr, null, 2));
    return NextResponse.json({ received: true });
  }
  console.log("[webhook] Supabase update ok for submissionId:", submissionId);

  // Update profiles with Stripe customer/subscription for billing portal
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (supabaseUserId && customerId) {
    const profileUpdate: Record<string, string | null> = {
      stripe_customer_id: customerId,
      stripe_session_id: session.id,
    };
    if (subscriptionId) profileUpdate.stripe_subscription_id = subscriptionId;
    await sb.from("profiles").update(profileUpdate).eq("id", supabaseUserId);
  }

  // Optional: paid_at and stripe_payment_intent (require migration 20250207000000)
  const extra: Record<string, unknown> = { paid_at: new Date().toISOString() };
  if (paymentIntentId) extra.stripe_payment_intent = paymentIntentId;
  const { error: extraErr } = await sb
    .from("submissions")
    .update(extra)
    .eq("id", submissionId);
  if (extraErr) {
    console.warn("[webhook] Optional paid_at/stripe_payment_intent update failed (run migration?):", extraErr.message);
  }

  fetch(`${appUrl}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId }),
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
