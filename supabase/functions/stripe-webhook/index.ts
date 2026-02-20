import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe";
import { createClient } from "npm:@supabase/supabase-js";

// Env vars required in Supabase Function settings:
// STRIPE_SECRET_KEY
// STRIPE_WEBHOOK_SECRET
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifyStripeSignature(req: Request, bodyText: string) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) throw new Error("Missing stripe-signature header");

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

  // Stripe Node SDK expects raw body string for constructEvent
  return stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const bodyText = await req.text(); // IMPORTANT: raw body
    const event = await verifyStripeSignature(req, bodyText);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const submissionId = session.metadata?.submission_id;
      if (!submissionId) {
        console.error("Missing metadata.submission_id on session", session.id);
        return new Response(JSON.stringify({ error: "Missing submission_id metadata" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabaseUserId = session.metadata?.supabase_user_id ?? session.client_reference_id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null)?.id ?? null;

      const submissionUpdates: Record<string, unknown> = {
        status: "processing",
        stripe_session_id: session.id,
        paid_at: new Date().toISOString(),
        stripe_payment_intent: paymentIntentId,
      };
      if (supabaseUserId) {
        submissionUpdates.user_id = supabaseUserId;
      }

      const { error: subErr } = await supabaseAdmin
        .from("submissions")
        .update(submissionUpdates)
        .eq("id", submissionId);

      if (subErr) {
        console.error("Submissions update error:", subErr);
        return new Response(JSON.stringify({ error: "DB update failed", details: subErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log("Updated submission", submissionId, "status=processing, paid_at set, stripe_session_id=", session.id);

      const appUrl = Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL");
      if (appUrl) {
        fetch(`${appUrl.replace(/\/$/, "")}/api/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId }),
        }).catch((err) => console.error("Process API call failed:", err));
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer as { id?: string } | null)?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as { id?: string } | null)?.id ?? null;
      if (supabaseUserId && customerId) {
        const profileUpdates: Record<string, unknown> = {
          stripe_customer_id: customerId,
          stripe_session_id: session.id,
        };
        if (subscriptionId) profileUpdates.stripe_subscription_id = subscriptionId;
        await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", supabaseUserId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook error" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
