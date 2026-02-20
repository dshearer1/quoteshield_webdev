import type { QuoteReportJson } from "./analyzeQuote";

export type RoofingUnitNormalization = {
  unit_basis: "square" | null;
  normalized_quantity: number | null; // squares
  unit_price_estimated: number | null; // $/square
  evidence: string[];
};

function extractSquaresFromText(text: string): number | null {
  const t = text.toLowerCase();

  // Range "15-30 squares" -> midpoint
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*squares?\b/);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return (a + b) / 2;
  }

  // Single "20 squares"
  const single = t.match(/\b(\d+(?:\.\d+)?)\s*squares?\b/);
  if (single) {
    const a = parseFloat(single[1]);
    if (Number.isFinite(a) && a > 0) return a;
  }

  // Bundles "54 bundles" -> squares (3 bundles ≈ 1 square)
  const bundles = t.match(/\b(\d+(?:\.\d+)?)\s*bundles?\b/);
  if (bundles) {
    const b = parseFloat(bundles[1]);
    if (Number.isFinite(b) && b > 0) return b / 3;
  }

  // If shingles qty present in JSON: "shingles" + "qty": 54 -> squares
  const shinglesQty = t.match(/"name":"[^"]*shingles[^"]*".*?"qty":\s*(\d+(?:\.\d+)?)/);
  if (shinglesQty) {
    const q = parseFloat(shinglesQty[1]);
    if (Number.isFinite(q) && q > 0) return q / 3;
  }

  return null;
}

export function normalizeRoofingToSquares(params: {
  reportJson: QuoteReportJson;
  projectType?: string | null;
  projectNotes?: string | null;
}): RoofingUnitNormalization {
  const { reportJson, projectType, projectNotes } = params;
  const evidence: string[] = [];

  const projectHint = `${projectType ?? ""} ${reportJson.summary?.project_type ?? ""}`.toLowerCase();
  const likelyReplacement =
    /replace|replacement|re-roof|reroof|tear\s*-?\s*off|new roof|roof replacement/.test(projectHint);

  if (!likelyReplacement) {
    evidence.push("Skipped: not confidently a replacement project.");
    return { unit_basis: null, normalized_quantity: null, unit_price_estimated: null, evidence };
  }

  const combinedText = [
    projectType ?? "",
    projectNotes ?? "",
    reportJson.summary?.project_type ?? "",
    reportJson.timeline?.timeline_text ?? "",
    reportJson.payment?.payment_terms_text ?? "",
    JSON.stringify(reportJson.costs?.line_items ?? []),
  ].join(" ");

  const squares = extractSquaresFromText(combinedText);
  if (squares != null) evidence.push(`Squares detected: ${squares}`);
  else evidence.push("Squares not detected.");

  const total = typeof reportJson.summary?.total === "number" && Number.isFinite(reportJson.summary.total)
    ? reportJson.summary.total
    : null;

  if (total == null) evidence.push("Total missing; cannot compute unit price.");

  const unitPrice = total != null && squares != null && squares > 0 ? total / squares : null;

  return {
    unit_basis: squares != null ? "square" : null,
    normalized_quantity: squares,
    unit_price_estimated: unitPrice,
    evidence,
  };
}
