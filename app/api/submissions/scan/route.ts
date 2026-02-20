import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/submissions/scan?submissionId=xxx
 * Returns { status, report (report_json), token, quoteType, error_message? }.
 * - status: actual submission status (draft | processing | pending_payment | complete | failed).
 *   Only "complete" means paid; "pending_payment" = free scan done, show free results and paywall.
 * - report: free snapshot (report_json with overall_score) when available; shown for both pending_payment and complete.
 * - error_message: set when status=failed (from ai_error).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let submissionId = searchParams.get("submissionId") ?? searchParams.get("submission_id");
    const publicId = searchParams.get("public_id") ?? searchParams.get("token");

    if (!submissionId && !publicId) {
      return NextResponse.json({ error: "Missing submissionId or public_id" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("submissions")
      .select("id, status, token, report_json, ai_result, quote_type, ai_error");

    if (submissionId) {
      query = query.eq("id", submissionId);
    } else if (publicId) {
      query = query.eq("token", publicId);
    } else {
      return NextResponse.json({ error: "Missing submissionId or public_id" }, { status: 400 });
    }

    const { data: sub, error } = await query.single();

    if (error || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    submissionId = sub.id;

    const reportJson = sub.report_json as Record<string, unknown> | null;
    const hasScoreShape =
      reportJson != null &&
      typeof (reportJson as { overall_score?: unknown }).overall_score === "number";

    // Return actual submission status so unpaid (pending_payment) stays on free scan; only "complete" = paid.
    const status = sub.status ?? "draft";
    const report = hasScoreShape ? reportJson : null;

    const payload: {
      submissionId: string;
      status: string;
      token: string | null;
      report: Record<string, unknown> | null;
      quoteType: string | null;
      error_message?: string;
    } = {
      submissionId: sub.id,
      status,
      token: sub.token ?? null,
      report,
      quoteType: sub.quote_type ?? null,
    };

    if (sub.status === "failed" && sub.ai_error) {
      payload.error_message = sub.ai_error;
    }

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
