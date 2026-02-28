import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/stripe/confirm
 * Body: { session_id }
 * Verifies Stripe checkout session is paid, updates submission (status, paid_at, stripe_payment_intent).
 * Idempotent: safe to call multiple times for the same session.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body?.session_id ?? body?.sessionId ?? null;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] });
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed", payment_status: session.payment_status },
        { status: 400 }
      );
    }

    const submissionId =
      session.metadata?.submission_id ?? session.metadata?.submissionId ?? null;
    if (!submissionId) {
      return NextResponse.json(
        { error: "No submission linked to this session" },
        { status: 400 }
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as { id?: string } | null)?.id ?? null;

    const sb = getSupabaseAdmin();
    const tokenFromMeta = session.metadata?.token ?? null;
    const { data: sub, error: fetchErr } = await sb
      .from("submissions")
      .select("id, paid_at, status, token")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const token = (sub as { token?: string | null }).token ?? tokenFromMeta ?? submissionId;

    // Idempotent: if already marked paid, return success without re-updating
    if (sub.paid_at) {
      return NextResponse.json({
        submission_id: submissionId,
        token: String(token),
        premium_unlocked: true,
      });
    }

    const updates: Record<string, unknown> = {
      status: "premium_ready",
      paid_at: new Date().toISOString(),
      stripe_session_id: sessionId,
    };
    if (paymentIntentId) updates.stripe_payment_intent = paymentIntentId;

    const { error: updateErr } = await sb
      .from("submissions")
      .update(updates)
      .eq("id", submissionId);

    if (updateErr) {
      console.error("[stripe/confirm] update error:", updateErr.message);
      return NextResponse.json(
        { error: "Failed to unlock premium" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submission_id: submissionId,
      token: String(token),
      premium_unlocked: true,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Confirm failed";
    console.error("[stripe/confirm]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
