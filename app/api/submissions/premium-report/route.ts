import { NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/submissions/premium-report?token=TOKEN
 * Requires: Authorization: Bearer <access_token>
 * Returns full report payload for premium view. Claims submission to user if paid and not yet claimed.
 */
export async function GET(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? searchParams.get("token_id");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const sb = getSupabaseAdmin();

  const { data: sub, error: subErr } = await sb
    .from("submissions")
    .select("id, user_id, status, paid_at, ai_result, ai_confidence")
    .eq("token", token)
    .single();

  if (subErr || !sub) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isPremium =
    (sub.paid_at != null) ||
    (sub.status === "premium_ready" || sub.status === "complete");
  if (!isPremium) {
    return NextResponse.json({ error: "Premium report not unlocked" }, { status: 403 });
  }

  if (sub.ai_result == null) {
    return NextResponse.json(
      { error: "Report not ready yet", status: sub.status },
      { status: 202 }
    );
  }

  const currentUserId = (sub as { user_id?: string | null }).user_id;
  if (!currentUserId) {
    const { error: claimErr } = await sb
      .from("submissions")
      .update({ user_id: userId })
      .eq("id", sub.id);
    if (claimErr) {
      console.error("[premium-report] claim error:", claimErr.message);
    }
  } else if (currentUserId !== userId) {
    return NextResponse.json({ error: "You do not have access to this report" }, { status: 403 });
  }

  const { data: lineItems } = await sb
    .from("submission_line_items")
    .select("id, category, description_raw, quantity, unit_price, line_total, sort_order")
    .eq("submission_id", sub.id)
    .order("sort_order", { ascending: true });

  const { data: analysis } = await sb
    .from("submission_analysis")
    .select("scope_score, price_score, clarity_score, risk_level, flags, benchmark_snapshot")
    .eq("submission_id", sub.id)
    .single();

  const { data: chatMessages } = await sb
    .from("negotiation_chat_messages")
    .select("id, role, message_text, created_at")
    .eq("submission_id", sub.id)
    .order("created_at", { ascending: true });

  const initialMessages = (chatMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    message_text: m.message_text,
    created_at: m.created_at,
  }));

  return NextResponse.json({
    submissionId: sub.id,
    data: sub.ai_result,
    reportJson: JSON.stringify(sub.ai_result, null, 2),
    aiConfidence: sub.ai_confidence ?? null,
    initialChatMessages: initialMessages,
    lineItems: lineItems ?? [],
    analysis: analysis ?? null,
  });
}
