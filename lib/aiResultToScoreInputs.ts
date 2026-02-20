import type { ScoreInputs } from "@/lib/scoring";

/** AI report shape (ai_result) from analyzeQuote. */
type AiReport = Record<string, unknown> & {
  summary?: { confidence?: string; quality_score?: number };
  payment?: { deposit_percent?: number | null };
  scope?: { missing_or_unclear?: unknown[] };
  costs?: { line_items?: unknown[]; high_cost_flags?: unknown[] };
  red_flags?: Array<{ title?: string; detail?: string }>;
  timeline?: { timeline_present?: boolean; timeline_clarity?: string };
  signals?: {
    pricing_outliers?: number;
    missing_scope?: number;
    warranty_red_flags?: number;
    timeline_red_flags?: number;
  };
  quality?: {
    doc_quality?: number;
    line_item_clarity?: number;
  };
};

function safeNum(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Map confidence string to 0..1 doc/line-item quality. */
function confidenceToQuality(c: string | undefined): number {
  if (c === "high") return 0.85;
  if (c === "low") return 0.45;
  return 0.65;
}

/** Count red flags that suggest warranty/payment concerns. */
function warrantySignalsFromRedFlags(
  red_flags: AiReport["red_flags"]
): number {
  if (!Array.isArray(red_flags) || red_flags.length === 0) return 0;
  const warrantyKeywords = /warranty|guarantee|coverage|term|year|limited/i;
  let n = 0;
  for (const f of red_flags) {
    const text = [f.title, f.detail].filter(Boolean).join(" ");
    if (warrantyKeywords.test(text)) n++;
  }
  return Math.min(n, 4);
}

/**
 * Convert AI analysis result (ai_result / report_json from analyzeQuote) into ScoreInputs.
 * Prefers explicit signals/quality when present (new schema); otherwise falls back to estimating from report fields.
 */
export function aiResultToScoreInputs(
  aiResult: AiReport | null | undefined
): ScoreInputs {
  const r = aiResult ?? {};
  const summary = (r.summary ?? {}) as { confidence?: string };
  const scope = (r.scope ?? {}) as { missing_or_unclear?: unknown[] };
  const costs = (r.costs ?? {}) as {
    line_items?: unknown[];
    high_cost_flags?: unknown[];
  };
  const timeline = (r.timeline ?? {}) as {
    timeline_present?: boolean;
    timeline_clarity?: string;
  };
  const redFlags = (r.red_flags ?? []) as Array<{
    title?: string;
    detail?: string;
  }>;
  const signals = r.signals;
  const quality = r.quality;

  // Prefer explicit signals/quality when present (from updated analyzeQuote schema)
  const hasExplicitSignals =
    signals != null &&
    (typeof signals.pricing_outliers === "number" ||
      typeof signals.missing_scope === "number" ||
      typeof signals.warranty_red_flags === "number" ||
      typeof signals.timeline_red_flags === "number");
  const hasExplicitQuality =
    quality != null &&
    (typeof quality.doc_quality === "number" ||
      typeof quality.line_item_clarity === "number");

  let doc_quality: number;
  let line_item_clarity: number;
  if (hasExplicitQuality) {
    doc_quality = clamp01(safeNum(quality!.doc_quality, 0.55));
    line_item_clarity = clamp01(safeNum(quality!.line_item_clarity, 0.5));
  } else {
    doc_quality = confidenceToQuality(summary.confidence ?? "medium");
    const lineItems = Array.isArray(costs.line_items) ? costs.line_items : [];
    line_item_clarity = lineItems.length > 0
      ? Math.min(0.9, 0.5 + lineItems.length * 0.05)
      : 0.5;
  }

  let missing_scope_signals: number;
  let pricing_outlier_signals: number;
  let warranty_signals: number;
  let timeline_signals: number;

  const payment = (r.payment ?? {}) as { deposit_percent?: number | null };
  const depositPercent =
    typeof payment.deposit_percent === "number" && Number.isFinite(payment.deposit_percent)
      ? payment.deposit_percent
      : null;
  const depositBump = depositPercent != null && depositPercent >= 40 ? 1 : 0;

  if (hasExplicitSignals) {
    missing_scope_signals = clampInt(
      safeNum(signals!.missing_scope, 0),
      0,
      10
    );
    pricing_outlier_signals = clampInt(
      safeNum(signals!.pricing_outliers, 0) + depositBump,
      0,
      10
    );
    warranty_signals = clampInt(
      safeNum(signals!.warranty_red_flags, 0) + depositBump,
      0,
      5
    );
    timeline_signals = clampInt(
      safeNum(signals!.timeline_red_flags, 0),
      0,
      5
    );
  } else {
    missing_scope_signals = Math.min(
      5,
      Array.isArray(scope.missing_or_unclear) ? scope.missing_or_unclear.length : 0
    );
    pricing_outlier_signals = Math.min(
      6,
      (Array.isArray(costs.high_cost_flags) ? costs.high_cost_flags.length : 0) + depositBump
    );
    warranty_signals = Math.min(
      5,
      warrantySignalsFromRedFlags(redFlags) + depositBump
    );
    const timelineSignalsFromPresent =
      timeline.timeline_present === false ? 1 : 0;
    const timelineSignalsFromClarity =
      timeline.timeline_clarity === "missing" ? 1 : 0;
    timeline_signals = Math.min(
      5,
      Math.max(0, timelineSignalsFromPresent + timelineSignalsFromClarity)
    );
  }

  return {
    doc_quality,
    line_item_clarity,
    missing_scope_signals,
    pricing_outlier_signals,
    warranty_signals,
    timeline_signals,
  };
}
