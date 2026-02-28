import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

    const sb = getSupabaseAdmin();
    let query = sb
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
    const report = hasScoreShape ? reportJson : (sub.ai_result as Record<string, unknown> | null) ?? reportJson;

    const { data: analysisRow } = await sb
      .from("submission_analysis")
      .select("pricing_position, job_units, job_unit_name, effective_unit_price, pricing_confidence, benchmark_snapshot, pricing_engine_result")
      .eq("submission_id", sub.id)
      .maybeSingle();

    const { data: lineItems } = await sb
      .from("submission_line_items")
      .select("id, description_raw, description_normalized, quantity, line_total, unit, category, sort_order")
      .eq("submission_id", sub.id)
      .order("sort_order", { ascending: true });

    const payload: {
      submissionId: string;
      status: string;
      token: string | null;
      report: Record<string, unknown> | null;
      quoteType: string | null;
      error_message?: string;
      analysis?: Record<string, unknown> | null;
      lineItems?: unknown[] | null;
    } = {
      submissionId: sub.id,
      status,
      token: sub.token ?? null,
      report,
      quoteType: sub.quote_type ?? null,
    };

    if (analysisRow) payload.analysis = analysisRow as Record<string, unknown>;
    if (lineItems && lineItems.length > 0) payload.lineItems = lineItems;

    if (sub.status === "failed" && sub.ai_error) {
      payload.error_message = sub.ai_error;
    }

    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
