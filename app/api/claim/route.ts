import { NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/claim
 * Body: { claim_token?: string, session_id?: string }
 * Requires: Authorization: Bearer <access_token>
 * Finds submission by token or Stripe session_id, verifies email matches auth user,
 * attaches submission to user (user_id, status, paid_at, stripe_*) and returns submission_id.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const claimToken = body?.claim_token ?? body?.claimToken ?? null;
  const sessionId = body?.session_id ?? body?.sessionId ?? null;

  if (!claimToken && !sessionId) {
    return NextResponse.json({ error: "Missing claim_token or session_id" }, { status: 400 });
  }
  if (claimToken && sessionId) {
    return NextResponse.json({ error: "Provide either claim_token or session_id, not both" }, { status: 400 });
  }

  const sb = supabaseAdmin;

  // Get auth user email for safety check
  const { data: authUser, error: userErr } = await sb.auth.admin.getUserById(userId);
  if (userErr || !authUser?.user?.email) {
    return NextResponse.json({ error: "Could not verify user" }, { status: 403 });
  }
  const authEmail = (authUser.user.email ?? "").trim().toLowerCase();

  let submissionId: string | null = null;
  let submission: { id: string; email: string; status: string; stripe_session_id: string | null; paid_at: string | null; stripe_payment_intent: string | null } | null = null;
  let stripeSessionIdUsed: string | null = null;

  if (claimToken) {
    const { data: row, error: findErr } = await sb
      .from("submissions")
      .select("id, email, status, stripe_session_id, paid_at, stripe_payment_intent")
      .eq("token", claimToken)
      .single();
    if (findErr || !row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    submissionId = row.id;
    submission = row as typeof submission;
  } else {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] });
    stripeSessionIdUsed = session.id;
    const metaId = session.metadata?.submission_id ?? session.metadata?.submissionId ?? null;
    if (!metaId) {
      return NextResponse.json({ error: "No submission linked to this payment session" }, { status: 404 });
    }
    const { data: row, error: findErr } = await sb
      .from("submissions")
      .select("id, email, status, stripe_session_id, paid_at, stripe_payment_intent")
      .eq("id", metaId)
      .single();
    if (findErr || !row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    submissionId = row.id;
    submission = row as typeof submission;
  }

  const submissionEmail = (submission.email ?? "").trim().toLowerCase();
  if (submissionEmail !== authEmail) {
    return NextResponse.json(
      { error: "This quote was submitted with a different email. Sign in with the email used at checkout." },
      { status: 403 }
    );
  }

  const paymentConfirmed = !!(submission.stripe_session_id ?? submission.paid_at);
  const updates: Record<string, unknown> = {
    user_id: userId,
    status: paymentConfirmed ? "processing" : submission.status,
  };
  if (!submission.paid_at) updates.paid_at = new Date().toISOString();
  if (stripeSessionIdUsed && !submission.stripe_session_id) updates.stripe_session_id = stripeSessionIdUsed;
  if (!submission.stripe_payment_intent && (sessionId || stripeSessionIdUsed)) {
    try {
      const stripe = getStripe();
      const sid = sessionId ?? stripeSessionIdUsed;
      const session = await stripe.checkout.sessions.retrieve(sid!, { expand: [] });
      const pi = session.payment_intent;
      const piId = typeof pi === "string" ? pi : (pi as { id?: string } | null)?.id ?? null;
      if (piId) updates.stripe_payment_intent = piId;
    } catch {
      // optional
    }
  }

  const { error: updateErr } = await sb
    .from("submissions")
    .update(updates)
    .eq("id", submissionId);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to claim submission", details: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ submission_id: submissionId });
}
