import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromAuthHeader } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET ?session_id=xxx
 * Returns submission_id for the Stripe checkout session.
 * Requires auth; returns only if the submission belongs to the current user (user_id match)
 * or has stripe_session_id match (so we can resolve right after checkout before webhook).
 */
export async function GET(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb
    .from("submissions")
    .select("id, user_id")
    .eq("stripe_session_id", sessionId)
    .single();

  if (error || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id != null && row.user_id !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ submission_id: row.id });
}
