/**
 * Deterministic scoring computed from extracted data (line items, scope, etc.)
 * Replaces AI-only signal conversion for submission_analysis.
 */

import type { QuoteReportJson } from "@/lib/ai/analyzeQuote";

export type DeterministicRiskLevel = "low" | "moderate" | "high" | null;

export interface DeterministicScores {
  scope_score: number | null;
  price_score: number | null;
  clarity_score: number | null;
  risk_level: DeterministicRiskLevel;
}

/** Scope checklist items for roofing (expand for other trades).
 * Presence = positive; missing = penalize. */
const ROOFING_SCOPE_CHECKLIST = [
  "shingles",
  "underlayment",
  "ice and water",
  "drip edge",
  "flashing",
  "ventilation",
  "deck",
  "inspection",
  "permit",
  "cleanup",
  "disposal",
  "warranty",
];

function hasScopeItem(item: string, present: string[], lineItems: Array<{ name: string }>): boolean {
  const itemLower = item.toLowerCase();
  const text = `${present.join(" ")} ${lineItems.map((li) => li.name).join(" ")}`.toLowerCase();
  return text.includes(itemLower) || text.includes(itemLower.replace(/\s+/g, ""));
}

/**
 * Scope score: % of checklist items present vs extracted scope/line items.
 * 0–100 scale.
 */
function computeScopeScore(report: QuoteReportJson): number | null {
  const present = report.scope?.present ?? [];
  const missing = report.scope?.missing_or_unclear ?? [];
  const lineItems = report.costs?.line_items ?? [];

  if (lineItems.length === 0 && present.length === 0) return null;

  const total = ROOFING_SCOPE_CHECKLIST.length;
  let found = 0;
  for (const item of ROOFING_SCOPE_CHECKLIST) {
    if (hasScopeItem(item, present, lineItems)) found++;
  }

  const missingPenalty = Math.min(30, missing.length * 5);
  const raw = Math.round((found / total) * 100) - missingPenalty;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Price score: based on unit presence and benchmark range.
 * 0–100 scale. Higher = more transparent pricing.
 */
function computePriceScore(report: QuoteReportJson): number | null {
  const lineItems = report.costs?.line_items ?? [];
  if (lineItems.length === 0) return null;

  let itemsWithUnit = 0;
  let itemsWithUnitPrice = 0;
  let itemsWithQuantity = 0;

  for (const li of lineItems) {
    if (li.unit_price != null && Number.isFinite(li.unit_price)) itemsWithUnitPrice++;
    if (li.qty != null && Number.isFinite(li.qty)) itemsWithQuantity++;
    if (li.unit_price != null || li.qty != null) itemsWithUnit++;
  }

  const hasUnitBasis = itemsWithUnitPrice > 0 || itemsWithQuantity > 0;
  const unitPct = lineItems.length > 0 ? itemsWithUnit / lineItems.length : 0;
  const clarityPct = lineItems.length > 0 ? (itemsWithUnitPrice + itemsWithQuantity) / (lineItems.length * 2) : 0;

  const raw = hasUnitBasis ? 50 + unitPct * 25 + clarityPct * 25 : 30;
  const flags = report.costs?.high_cost_flags ?? [];
  const penalty = Math.min(30, flags.length * 5);

  return Math.max(0, Math.min(100, Math.round(raw - penalty)));
}

/**
 * Clarity score: presence of quantities, unit pricing, warranty, timeline.
 * 0–100 scale.
 */
function computeClarityScore(report: QuoteReportJson): number | null {
  const lineItems = report.costs?.line_items ?? [];
  const hasQuantity = lineItems.some((li) => li.qty != null && Number.isFinite(li.qty));
  const hasUnitPrice = lineItems.some((li) => li.unit_price != null && Number.isFinite(li.unit_price));
  const hasWarranty = (report.scope?.present ?? []).some((s) =>
    /warranty|guarantee/.test((s ?? "").toLowerCase())
  );
  const timeline = report.timeline;
  const hasTimeline = timeline?.timeline_present === true || (timeline?.timeline_clarity ?? "") !== "missing";

  let score = 40;
  if (hasQuantity) score += 15;
  if (hasUnitPrice) score += 15;
  if (hasWarranty) score += 15;
  if (hasTimeline) score += 15;

  return Math.min(100, score);
}

/**
 * Risk level: weighted combination of scope, price, clarity.
 */
function computeRiskLevel(
  scopeScore: number | null,
  priceScore: number | null,
  clarityScore: number | null
): DeterministicRiskLevel {
  const scores = [scopeScore, priceScore, clarityScore].filter(
    (s): s is number => s != null && Number.isFinite(s)
  );
  if (scores.length === 0) return null;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 75) return "low";
  if (avg >= 55) return "moderate";
  return "high";
}

/**
 * Compute all deterministic scores from report JSON.
 */
export function computeDeterministicScores(report: QuoteReportJson): DeterministicScores {
  const scope_score = computeScopeScore(report);
  const price_score = computePriceScore(report);
  const clarity_score = computeClarityScore(report);
  const risk_level = computeRiskLevel(scope_score, price_score, clarity_score);

  return {
    scope_score,
    price_score,
    clarity_score,
    risk_level,
  };
}
