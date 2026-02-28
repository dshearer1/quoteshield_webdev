/**
 * Pricing engine: resolve trade context, estimate job_units and total, fetch benchmark, classify, write output for submission_analysis.
 */

import { fetchUnitBenchmark, UNIT_BASIS_SQUARE } from "./benchmark";
import { classifyPricing } from "./classify";
import { estimateRoofingUnits, UNIT_BASIS_SQUARE as ROOFING_UNIT_BASIS } from "../trades/roofing/estimateUnits";
import type { LineItemRow } from "../trades/roofing/estimateUnits";

export type SubmissionRecord = {
  project_type?: string | null;
  region_key?: string | null;
  report_json?: Record<string, unknown> | null;
  ai_result?: Record<string, unknown> | null;
  project_value?: number | null;
};

export type SubmissionAnalysisRecord = {
  trade?: string | null;
  subtrade?: string | null;
  region_key?: string | null;
  unit_basis?: string | null;
  normalized_quantity?: number | null;
  unit_price_estimated?: number | null;
};

export type PricingEngineOutput = {
  pricing_position: string;
  job_units: number | null;
  job_unit_name: string;
  effective_unit_price: number | null;
  pricing_confidence: number | null;
  benchmark_snapshot: Record<string, unknown>;
  pricing_engine_result: Record<string, unknown>;
};

function resolveTradeContext(
  submission: SubmissionRecord,
  analysis: SubmissionAnalysisRecord | null
): { trade: string; subtrade: string; region_key: string } {
  if (analysis?.trade && analysis?.subtrade && analysis?.region_key) {
    return {
      trade: String(analysis.trade),
      subtrade: String(analysis.subtrade),
      region_key: String(analysis.region_key),
    };
  }
  const projectType = submission.project_type ?? "Roofing";
  const trade = projectType.trim() || "Roofing";
  const subtrade = "Residential Replacement";
  const region_key = analysis?.region_key ?? submission.region_key ?? "unknown";
  return { trade, subtrade, region_key };
}

export async function runPricingEngine(params: {
  supabase: unknown;
  submission: SubmissionRecord;
  submission_analysis: SubmissionAnalysisRecord | null;
  lineItems: LineItemRow[];
}): Promise<PricingEngineOutput> {
  const { supabase, submission, submission_analysis, lineItems } = params;

  const { trade, subtrade, region_key } = resolveTradeContext(submission, submission_analysis);

  const reportJson = submission.report_json ?? submission.ai_result ?? null;
  const summaryTotal = reportJson && typeof reportJson === "object" && reportJson.summary && typeof (reportJson.summary as Record<string, unknown>).total === "number"
    ? (reportJson.summary as Record<string, unknown>).total as number
    : null;
  const reportTotal = reportJson && typeof reportJson === "object" && typeof (reportJson as Record<string, unknown>).total === "number"
    ? (reportJson as Record<string, unknown>).total as number
    : summaryTotal;

  const estimate = estimateRoofingUnits({
    lineItems,
    analysis: submission_analysis ? {
      unit_basis: submission_analysis.unit_basis ?? null,
      normalized_quantity: submission_analysis.normalized_quantity ?? null,
    } : null,
    reportJson: reportJson && typeof reportJson === "object" ? { summary: reportJson.summary as Record<string, unknown>, total: reportTotal ?? undefined } : null,
    project_value: submission.project_value ?? null,
  });

  const job_units = estimate.job_units;
  const job_unit_name = ROOFING_UNIT_BASIS;
  const effective_unit_price = estimate.effective_per_square;
  let pricing_confidence = estimate.confidence;

  let low: number | null = null;
  let mid: number | null = null;
  let high: number | null = null;
  let benchmark_row: Record<string, unknown> = {};

  let benchmarkSource: string | null = null;
  let benchmarkEffectiveDate: string | null = null;
  if (job_units != null && (effective_unit_price != null || estimate.roofing_scope_total != null)) {
    const benchmark = await fetchUnitBenchmark({
      supabase,
      trade,
      subtrade,
      region_key,
      unit_basis: UNIT_BASIS_SQUARE,
    });
    low = benchmark.unit_low;
    mid = benchmark.unit_mid ?? (benchmark.unit_low != null && benchmark.unit_high != null ? (benchmark.unit_low + benchmark.unit_high) / 2 : null);
    high = benchmark.unit_high;
    benchmark_row = benchmark.benchmark_row;
    benchmarkSource = benchmark.source;
    benchmarkEffectiveDate = benchmark.effective_date;
    if (low == null && high == null) pricing_confidence = Math.min(pricing_confidence, 0.3);
  }

  const classification = classifyPricing({
    effectiveUnitPrice: effective_unit_price,
    low,
    mid,
    high,
    job_units,
  });

  const market_range = low != null && high != null ? { low, mid: mid ?? (low + high) / 2, high } : undefined;

  const benchmark_snapshot: Record<string, unknown> = {
    mode: "unit",
    unit_basis: job_unit_name,
    normalized_quantity: job_units,
    quote_total: estimate.roofing_scope_total,
    unit_price_estimated: effective_unit_price,
    unit_low: low ?? undefined,
    unit_mid: mid ?? undefined,
    unit_high: high ?? undefined,
    market_range,
    region_key,
    trade,
    subtrade,
    source: benchmarkSource,
    effective_date: benchmarkEffectiveDate,
    benchmark_row,
    evidence: estimate.evidence,
  };

  const pricing_engine_result: Record<string, unknown> = {
    pricing_position: classification.pricing_position,
    pricing_position_label: classification.pricing_position_label,
    pricing_confidence: classification.pricing_confidence,
    delta_vs_mid: classification.delta_vs_mid,
    estimated_overage_mid: classification.estimated_overage_mid,
    estimated_overage_high: classification.estimated_overage_high,
    pct_vs_midpoint: classification.pct_vs_midpoint,
    job_units,
    job_unit_name,
    effective_unit_price,
    market_low: low,
    market_mid: mid,
    market_high: high,
    evidence: estimate.evidence,
  };

  return {
    pricing_position: classification.pricing_position_label,
    job_units,
    job_unit_name,
    effective_unit_price,
    pricing_confidence: classification.pricing_confidence,
    benchmark_snapshot,
    pricing_engine_result,
  };
}
