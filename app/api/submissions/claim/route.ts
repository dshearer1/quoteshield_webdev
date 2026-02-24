import { NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/submissions/claim
 * Body: { submission_id }
 * Requires: Authorization: Bearer <access_token>
 * Attaches the submission to the authenticated user (user_id). Idempotent.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const submissionId = body?.submission_id ?? body?.submissionId ?? null;
  if (!submissionId || typeof submissionId !== "string") {
    return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
  }

  const sb = supabaseAdmin;

  const { data: sub, error: fetchErr } = await sb
    .from("submissions")
    .select("id, user_id")
    .eq("id", submissionId)
    .single();

  if (fetchErr || !sub) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if ((sub as { user_id?: string | null }).user_id === userId) {
    return NextResponse.json({ ok: true });
  }

  const { error: updateErr } = await sb
    .from("submissions")
    .update({ user_id: userId })
    .eq("id", submissionId);

  if (updateErr) {
    console.error("[submissions/claim] update error:", updateErr.message);
    return NextResponse.json({ error: "Failed to claim submission" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
