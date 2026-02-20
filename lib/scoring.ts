export type Risk = "Low" | "Medium" | "High";

export type ScoreInputs = {
  doc_quality: number; // 0..1
  line_item_clarity: number; // 0..1
  missing_scope_signals: number; // >=0
  pricing_outlier_signals: number; // >=0
  warranty_signals: number; // >=0
  timeline_signals: number; // >=0
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function riskFromScore(score: number): Risk {
  if (score >= 80) return "Low";
  if (score >= 60) return "Medium";
  return "High";
}

function ratingFromScore(score: number): "Low Concern" | "Moderate Concern" | "High Concern" {
  if (score >= 80) return "Low Concern";
  if (score >= 60) return "Moderate Concern";
  return "High Concern";
}

function confidenceLabel(doc_quality: number, line_item_clarity: number): "High" | "Medium" | "Low" {
  const c = (doc_quality + line_item_clarity) / 2;
  if (c >= 0.8) return "High";
  if (c >= 0.55) return "Medium";
  return "Low";
}

// Convert "signal counts" into penalties (0..100 scale)
function penaltyFromSignals(signals: number, maxSignalsBeforeMaxPenalty: number) {
  const ratio = Math.min(1, signals / maxSignalsBeforeMaxPenalty);
  return ratio * 45;
}

export function computeFreeScore(inputs: ScoreInputs) {
  const doc = clamp(inputs.doc_quality * 100);
  const clarity = clamp(inputs.line_item_clarity * 100);

  const laborScore = clamp(
    70 + clarity * 0.2 + doc * 0.1 - penaltyFromSignals(inputs.pricing_outlier_signals, 6) * 0.35
  );
  const materialsScore = clamp(
    68 + clarity * 0.15 - penaltyFromSignals(inputs.pricing_outlier_signals, 6) * 0.55
  );
  const scopeScore = clamp(
    72 + clarity * 0.1 - penaltyFromSignals(inputs.missing_scope_signals, 5) * 0.8
  );
  const warrantyScore = clamp(75 - penaltyFromSignals(inputs.warranty_signals, 4));
  const timelineScore = clamp(78 - penaltyFromSignals(inputs.timeline_signals, 4) * 0.9);

  const overall =
    laborScore * 0.2 +
    materialsScore * 0.2 +
    scopeScore * 0.25 +
    warrantyScore * 0.2 +
    timelineScore * 0.1 +
    doc * 0.025 +
    clarity * 0.025;

  const overallScore = clamp(Math.round(overall));
  const confidence = confidenceLabel(inputs.doc_quality, inputs.line_item_clarity);
  const categories = [
    { name: "Labor", score: Math.round(laborScore), risk: riskFromScore(laborScore) },
    { name: "Materials", score: Math.round(materialsScore), risk: riskFromScore(materialsScore) },
    { name: "Scope", score: Math.round(scopeScore), risk: riskFromScore(scopeScore) },
    { name: "Warranty", score: Math.round(warrantyScore), risk: riskFromScore(warrantyScore) },
    { name: "Timeline", score: Math.round(timelineScore), risk: riskFromScore(timelineScore) },
  ];

  const findings: string[] = [];
  if (inputs.pricing_outlier_signals >= 2)
    findings.push("Some pricing items look outside typical ranges.");
  if (inputs.missing_scope_signals >= 1)
    findings.push("Some scope details may be missing or unclear.");
  if (inputs.warranty_signals >= 1)
    findings.push("Warranty coverage may be limited compared to common standards.");
  if (inputs.timeline_signals >= 1)
    findings.push("Timeline details may need clarification before signing.");

  const preview_findings = findings.slice(0, 3);
  const locked_findings_count = Math.max(
    3,
    inputs.pricing_outlier_signals +
      inputs.missing_scope_signals +
      inputs.warranty_signals +
      inputs.timeline_signals
  );

  return {
    overall_score: overallScore,
    overall_rating: ratingFromScore(overallScore),
    confidence,
    categories,
    preview_findings:
      preview_findings.length > 0
        ? preview_findings
        : [
            "No major red flags detected in the snapshot. Full review recommended before signing.",
          ],
    locked_findings_count,
    score_breakdown: { inputs },
  };
}
