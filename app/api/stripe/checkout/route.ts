import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = body?.submissionId;
    const supabaseUserId = body?.supabase_user_id ?? body?.supabaseUserId ?? null;
    const origin = body?.origin ?? body?.return_origin ?? null;
    const isComparison = body?.quote_type === "comparison";
    if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    // Submission must already exist (created by POST /api/submit with status=pending_payment, user_id before redirect)

    const appUrl = origin ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: "APP_URL or origin not configured" }, { status: 500 });

    const priceId = isComparison
      ? (process.env.STRIPE_PRICE_ID_COMPARISON ?? process.env.STRIPE_PRICE_ID)
      : process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: "STRIPE_PRICE_ID not configured" }, { status: 500 });

    const sb = supabaseAdmin;
    const { data: sub, error: subErr } = await sb
      .from("submissions")
      .select("id, email, token")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const token = (sub.token ?? "") || submissionId;
    const baseUrl = appUrl.replace(/\/$/, "");
    const successUrl = `${baseUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/r/${encodeURIComponent(token)}`;

    const metadata: Record<string, string> = {
      submission_id: submissionId,
      token: String(token),
    };
    if (supabaseUserId) metadata.supabase_user_id = supabaseUserId;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(supabaseUserId && { client_reference_id: supabaseUserId }),
      ...(sub.email && { customer_email: sub.email }),
    });

    if (session.id) {
      const { error: updateErr } = await sb
        .from("submissions")
        .update({ stripe_session_id: session.id })
        .eq("id", submissionId);
      if (updateErr) {
        console.error("[checkout] submissions update failed:", updateErr.message, updateErr.details);
        return NextResponse.json(
          {
            error: "Failed to save checkout session",
            details: process.env.NODE_ENV === "development" ? String(updateErr.message) : undefined,
          },
          { status: 500 }
        );
      }
      if (supabaseUserId) {
        const { error: userLinkErr } = await sb
          .from("submissions")
          .update({ user_id: supabaseUserId })
          .eq("id", submissionId);
        if (userLinkErr) console.warn("[checkout] submissions user_id update failed (run migration?):", userLinkErr.message);
        const { error: profileErr } = await sb
          .from("profiles")
          .update({ stripe_session_id: session.id })
          .eq("id", supabaseUserId);
        if (profileErr) console.warn("[checkout] profiles update failed:", profileErr.message);
      }
    }

    return NextResponse.json({ url: session.url ?? null });
  } catch (e: unknown) {
    console.error("[checkout] Error:", e);
    const message = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
