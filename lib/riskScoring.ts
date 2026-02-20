import type { QuoteReportJson } from "@/lib/ai/analyzeQuote";

export interface RiskScoresResult {
  final_score: number;
  risk_level: "low" | "medium" | "high";
  category_scores: {
    payment: number;
    timeline: number;
    scope: number;
    warranty: number;
    pricing: number;
  };
  explanations: string[];
}

const WEIGHTS = {
  payment: 0.25,
  timeline: 0.2,
  scope: 0.2,
  warranty: 0.2,
  pricing: 0.15,
} as const;

function clampScore(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

function scoreToRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 85) return "low";
  if (score >= 65) return "medium";
  return "high";
}

/**
 * Calculate QuoteShield risk scores from report_json.
 * Returns final_score (0–100), risk_level, category_scores, and human-readable explanations.
 */
export function calculateRiskScores(report_json: QuoteReportJson | Record<string, unknown> | null): RiskScoresResult {
  const r = report_json ?? {};
  const payment = (r.payment ?? {}) as QuoteReportJson["payment"];
  const timeline = (r.timeline ?? {}) as QuoteReportJson["timeline"];
  const scope = (r.scope ?? {}) as QuoteReportJson["scope"];
  const costs = (r.costs ?? {}) as QuoteReportJson["costs"];
  const summary = (r.summary ?? r.quote_overview ?? {}) as Record<string, unknown>;
  const total = Number(summary?.total ?? summary?.quote_total ?? 0) || 1;
  const paymentTermsText = (payment?.payment_terms_text ?? "").toLowerCase();
  const timelineText = (timeline?.timeline_text ?? "").toLowerCase();
  const present = scope?.present ?? [];
  const missingOrUnclear = scope?.missing_or_unclear ?? [];

  const explanations: string[] = [];

  // --- PAYMENT (0–100) ---
  const depositPercent = payment?.deposit_percent ?? null;
  const hasMilestoneLanguage =
    /\b(milestone|phase|stage|upon completion|after (tear-?off|inspection|delivery)|%\s*(at|upon|due))\b/i.test(paymentTermsText) ||
    (payment?.recommended_schedule_example?.length ?? 0) >= 2;
  const hasFinalInspectionPayment =
    /\b(final|inspection|sign-?off|completion)\s*(payment|due|%\s*)\b/i.test(paymentTermsText) ||
    /\b(payment|%\s*)\s*(after|upon)\s*(final|inspection)\b/i.test(paymentTermsText);

  let paymentScore = 70; // default mid
  if (depositPercent != null) {
    if (depositPercent <= 20) paymentScore = 90;
    else if (depositPercent <= 30) paymentScore = 75;
    else if (depositPercent <= 50) paymentScore = 55;
    else paymentScore = 35;
  }
  if (hasMilestoneLanguage) paymentScore = Math.min(100, paymentScore + 10);
  if (hasFinalInspectionPayment) paymentScore = Math.min(100, paymentScore + 5);
  paymentScore = clampScore(paymentScore);

  if (depositPercent != null) {
    if (depositPercent > 30) explanations.push(`Deposit is ${depositPercent}% (typical range 10–30%), which increases payment risk.`);
    else if (depositPercent <= 20) explanations.push(`Deposit of ${depositPercent}% is within a reasonable range.`);
  }
  if (hasMilestoneLanguage) explanations.push("Quote references milestone- or phase-based payments.");
  if (hasFinalInspectionPayment) explanations.push("Final payment is tied to inspection or completion.");
  if (!hasMilestoneLanguage && !hasFinalInspectionPayment && (paymentTermsText || depositPercent != null)) {
    explanations.push("Consider requesting milestone-based payments and final payment after inspection.");
  }

  // --- TIMELINE (0–100) ---
  const timelinePresent = timeline?.timeline_present === true;
  const timelineClarity = timeline?.timeline_clarity ?? "missing";
  const hasMilestoneRefs = /\b(milestone|start date|completion|schedule|timeline|week|day)\b/i.test(timelineText);

  let timelineScore = 40;
  if (timelinePresent) timelineScore = 70;
  if (timelineClarity === "clear") timelineScore = 90;
  else if (timelineClarity === "basic") timelineScore = 65;
  if (hasMilestoneRefs) timelineScore = Math.min(100, timelineScore + 15);
  timelineScore = clampScore(timelineScore);

  if (timelineClarity === "missing" || !timelinePresent) {
    explanations.push("No written timeline or milestones were provided in the quote.");
  } else if (timelineClarity === "clear" || hasMilestoneRefs) {
    explanations.push("Quote includes timeline or milestone information.");
  }

  // --- SCOPE (0–100) ---
  const totalScopeItems = present.length + missingOrUnclear.length;
  const definedCount = present.length;
  const scopeRatio = totalScopeItems > 0 ? definedCount / totalScopeItems : 0;
  const scopeScore = clampScore(scopeRatio * 100);

  if (totalScopeItems > 0) {
    explanations.push(`${definedCount} of ${totalScopeItems} scope items are clearly defined; ${missingOrUnclear.length} are missing or unclear.`);
  } else {
    explanations.push("Scope detail is limited; key items (materials, permit, cleanup) may need clarification.");
  }

  // --- WARRANTY (0–100) ---
  const presentLower = present.map((p) => p.toLowerCase());
  const hasWarrantyMention = presentLower.some((p) => /warrant/i.test(p));
  const hasLaborWarranty = presentLower.some((p) => /labor.*warrant|workmanship|work\s*warrant/i.test(p));
  const notes = (r.notes ?? []) as string[];
  const notesText = notes.join(" ").toLowerCase();
  const notesWarranty = /warrant/i.test(notesText);

  let warrantyScore = 30;
  if (hasWarrantyMention) warrantyScore = 65;
  if (hasLaborWarranty || (hasWarrantyMention && notesWarranty)) warrantyScore = 85;
  if (hasWarrantyMention && hasLaborWarranty) warrantyScore = 95;
  warrantyScore = clampScore(warrantyScore);

  if (!hasWarrantyMention && !notesWarranty) {
    explanations.push("Warranty coverage is not clearly stated in the quote.");
  } else if (hasLaborWarranty || hasWarrantyMention) {
    explanations.push(hasLaborWarranty ? "Labor or workmanship warranty is mentioned." : "Warranty is mentioned; confirm labor and materials coverage.");
  }

  // --- PRICING (0–100) ---
  const lineItems = costs?.line_items ?? [];
  const itemizedCount = lineItems.length;
  const hasItemization = itemizedCount >= 3;
  let largeSingleLine = false;
  if (total > 0 && lineItems.length > 0) {
    const maxLineTotal = Math.max(...lineItems.map((i) => Number((i as { total?: number }).total ?? 0)));
    if (maxLineTotal > total * 0.5) largeSingleLine = true;
  }

  let pricingScore = 60;
  if (hasItemization) pricingScore = 80;
  if (itemizedCount >= 5) pricingScore = 90;
  if (largeSingleLine) pricingScore = Math.max(0, pricingScore - 25);
  pricingScore = clampScore(pricingScore);

  if (itemizedCount === 0) {
    explanations.push("Quote does not show itemized line items; request a breakdown of labor, materials, and other costs.");
  } else if (hasItemization) {
    explanations.push(`Quote includes ${itemizedCount} line items, which helps verify pricing.`);
  }
  if (largeSingleLine) {
    explanations.push("A single line item represents more than half of the total; ask for more detail on that cost.");
  }

  // --- WEIGHTED FINAL ---
  const final_score = clampScore(
    paymentScore * WEIGHTS.payment +
      timelineScore * WEIGHTS.timeline +
      scopeScore * WEIGHTS.scope +
      warrantyScore * WEIGHTS.warranty +
      pricingScore * WEIGHTS.pricing
  );
  const risk_level = scoreToRiskLevel(final_score);

  return {
    final_score,
    risk_level,
    category_scores: {
      payment: paymentScore,
      timeline: timelineScore,
      scope: scopeScore,
      warranty: warrantyScore,
      pricing: pricingScore,
    },
    explanations,
  };
}
