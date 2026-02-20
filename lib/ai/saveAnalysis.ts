import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aiResultToScoreInputs } from "@/lib/aiResultToScoreInputs";
import { computeFreeScore } from "@/lib/scoring";
import { buildPreviewFindings } from "@/lib/previewFindings";
import {
  classifyRoofing,
  extractStateFromAddress,
  computeScopeScore,
  computePriceScore,
  computeRiskLevel,
} from "@/lib/ai/deterministicScoring";
import { normalizeRoofingToSquares } from "@/lib/ai/unitNormalizationRoofing";
import type { AnalyzeResult, QuoteReportJson, FreeScanUiResult } from "./analyzeQuote";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

function toNum(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normCategory(name: string): string {
  const s = (name ?? "").toLowerCase();
  if (s.includes("labor")) return "labor";
  if (s.includes("material")) return "material";
  if (s.includes("disposal") || s.includes("dump") || s.includes("haul")) return "disposal";
  if (s.includes("permit")) return "permit";
  if (s.includes("warranty")) return "warranty";
  if (s.includes("equipment") || s.includes("lift") || s.includes("machine")) return "equipment";
  if (s.includes("fee") || s.includes("service")) return "service_fee";
  return "misc";
}

export async function saveSubmissionAnalysis(params: {
  submissionId: string;
  reportJson: QuoteReportJson;
  analysisVersion?: string;
  address?: string | null;
}) {
  const { submissionId, reportJson } = params;
  const version = params.analysisVersion ?? "v1";
  const supabase = getAdminSupabase();

  await supabase
    .from("submissions")
    .update({ analysis_status: "analyzed" })
    .eq("id", submissionId);

  const lineItems = reportJson.costs?.line_items ?? [];

  if (lineItems.length) {
    await supabase
      .from("submission_line_items")
      .delete()
      .eq("submission_id", submissionId);

    const rows = lineItems.slice(0, 500).map((li, idx) => ({
      submission_id: submissionId,
      category: normCategory(li.name),
      description_raw: li.name ?? null,
      description_normalized: li.name ?? null,
      quantity: toNum(li.qty),
      unit: null,
      unit_price: toNum(li.unit_price),
      line_total: toNum(li.total),
      confidence: null,
      sort_order: idx,
    }));

    await supabase.from("submission_line_items").insert(rows);
  }

  // fetch submission context (address, notes, project_type)
  const { data: subRow, error: subErr } = await supabase
    .from("submissions")
    .select("id, address, project_notes, project_type")
    .eq("id", submissionId)
    .single();
  if (subErr) throw subErr;

  const tradeClass = classifyRoofing({
    reportJson,
    projectType: subRow?.project_type ?? null,
  });
  const region_key = extractStateFromAddress(subRow?.address ?? null);

  const unitNorm = normalizeRoofingToSquares({
    reportJson,
    projectType: subRow?.project_type ?? null,
    projectNotes: subRow?.project_notes ?? null,
  });

  // template
  const { data: tpl } = await supabase
    .from("trade_templates")
    .select("scope_checklist")
    .eq("trade", tradeClass.trade)
    .eq("subtrade", tradeClass.subtrade)
    .maybeSingle();

  const requiredChecklist: string[] = Array.isArray(tpl?.scope_checklist) ? (tpl?.scope_checklist as string[]) : [];
  const presentItems = [
    ...(reportJson.scope?.present ?? []),
    ...(reportJson.costs?.line_items?.map((x) => x.name) ?? []),
  ].filter(Boolean) as string[];

  const scope_score = computeScopeScore(presentItems, requiredChecklist);
  const scope_missing = requiredChecklist.filter(
    (r) => !presentItems.some((p) => p.toLowerCase().includes(r.toLowerCase()))
  );

  let priceScore: number | null = null;
  let benchmark_snapshot: Record<string, unknown> | null = null;

  if (
    unitNorm.unit_basis &&
    unitNorm.unit_price_estimated != null
  ) {
    const unitBmRes = await supabase
      .from("pricing_benchmarks")
      .select("unit_low, unit_mid, unit_high, source, effective_date, created_at")
      .eq("trade", tradeClass.trade)
      .eq("subtrade", tradeClass.subtrade)
      .eq("region_key", region_key)
      .eq("unit_basis", unitNorm.unit_basis)
      .order("effective_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (unitBmRes.error) {
      console.error("[saveSubmissionAnalysis] unit benchmark lookup error:", unitBmRes.error);
    }

    const bm = unitBmRes.data;

    if (bm?.unit_low != null && bm?.unit_high != null) {
      const low = Number(bm.unit_low);
      const mid = Number(bm.unit_mid ?? bm.unit_low);
      const high = Number(bm.unit_high);

      priceScore = computePriceScore(
        unitNorm.unit_price_estimated,
        low,
        mid,
        high
      );

      benchmark_snapshot = {
        mode: "unit",
        unit_basis: unitNorm.unit_basis,
        unit_price_estimated: unitNorm.unit_price_estimated,
        normalized_quantity: unitNorm.normalized_quantity,
        range: { low, mid, high },
        region_key,
        trade: tradeClass.trade,
        subtrade: tradeClass.subtrade,
        source: bm.source ?? null,
        effective_date: bm.effective_date ?? null,
        evidence: unitNorm.evidence,
      };
    }
  }

  const clarityScore =
    reportJson.quality?.doc_quality != null
      ? Math.round(Math.max(0, Math.min(1, reportJson.quality.doc_quality)) * 100)
      : null;

  const risk_level = computeRiskLevel(scope_score, priceScore, clarityScore);

  const flags = {
    red_flags: reportJson.red_flags ?? [],
    preview_findings: reportJson.preview_findings ?? [],
    scope_missing_keys: scope_missing,
  };

  await supabase.from("submission_analysis").upsert(
    {
      submission_id: submissionId,
      trade: tradeClass.trade,
      subtrade: tradeClass.subtrade,
      region_key,
      scope_score,
      price_score: priceScore,
      clarity_score: clarityScore,
      company_score: null,
      risk_level,
      unit_basis: unitNorm.unit_basis,
      normalized_quantity: unitNorm.normalized_quantity,
      unit_price_estimated: unitNorm.unit_price_estimated,
      flags,
      benchmark_snapshot,
      version,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" }
  );

  await supabase
    .from("submissions")
    .update({
      trade: tradeClass.trade,
      subtrade: tradeClass.subtrade,
      region_key,
    })
    .eq("id", submissionId);

  console.log("[/api/process] saveSubmissionAnalysis completed");
}

export interface SaveFullAnalysisOptions {
  isUnpaidPreview?: boolean;
  isRevisedFree?: boolean;
  address?: string | null;
}

/**
 * Saves full analysis result (from analyzeQuote) to the submissions table
 * and persists structured data via saveSubmissionAnalysis.
 */
export async function saveFullAnalysis(
  submissionId: string,
  analyzeResult: AnalyzeResult,
  options?: SaveFullAnalysisOptions | null
): Promise<{ error: unknown }> {
  const { report_json, report_html } = analyzeResult;
  const r = report_json as Record<string, unknown> & {
    preview_findings?: unknown;
    payment?: { deposit_percent?: number | null };
  };

  const inputs = aiResultToScoreInputs(report_json as Parameters<typeof aiResultToScoreInputs>[0]);
  const scoreObj = computeFreeScore(inputs);
  const depositPercent = r?.payment?.deposit_percent ?? null;
  const aiPreview = Array.isArray(r.preview_findings)
    ? (r.preview_findings as string[])
        .filter((s) => typeof s === "string" && (s as string).trim().length >= 10)
        .slice(0, 3)
        .map((s) => String(s).trim())
    : [];
  const scoreFindings = Array.isArray(scoreObj.preview_findings) ? (scoreObj.preview_findings as string[]) : [];
  const preview_findings = buildPreviewFindings(depositPercent, aiPreview, scoreFindings, 4);

  const reportJsonForUi = { ...scoreObj, preview_findings };
  const ai_confidence =
    (r?.summary as { confidence?: string })?.confidence ?? (r?.confidence as string) ?? "medium";
  const opts = options ?? {};
  const isUnpaid = opts.isUnpaidPreview ?? false;
  const isRevisedFree = opts.isRevisedFree ?? false;
  const finalStatus = isRevisedFree ? "complete" : isUnpaid ? "pending_payment" : "complete";

  const { error } = await supabaseAdmin
    .from("submissions")
    .update({
      status: finalStatus,
      processed_at: new Date().toISOString(),
      analysis_status: "report_ready",
      report_json: reportJsonForUi as object,
      report_html,
      ai_result: report_json as object,
      ai_confidence,
      ai_error: null,
    })
    .eq("id", submissionId);

  if (error) return { error };

  await saveSubmissionAnalysis({
    submissionId,
    reportJson: report_json,
    analysisVersion: "v1",
    address: options?.address ?? undefined,
  });

  return { error: null };
}

/**
 * Saves free scan result to submissions.free_scan_json.
 */
export async function saveFreeScanAnalysis(
  submissionId: string,
  freeScanResult: FreeScanUiResult,
  options?: { updateStatus?: "pending_payment" | null }
): Promise<{ error: unknown }> {
  const updates: Record<string, unknown> = {
    free_scan_json: freeScanResult,
  };
  if (options?.updateStatus) {
    updates.status = options.updateStatus;
  }

  const { error } = await supabaseAdmin
    .from("submissions")
    .update(updates)
    .eq("id", submissionId);

  if (error) return { error };
  return { error: null };
}
