export type TradeClass = {
  trade: string;
  subtrade: string;
};

export function classifyRoofing(params: {
  projectType?: string | null;
  reportJson: any;
}): TradeClass {
  const text = `${params.projectType ?? ""} ${params.reportJson?.summary?.project_type ?? ""}`.toLowerCase();

  if (text.includes("repair")) {
    return { trade: "Roofing", subtrade: "Residential Repair" };
  }

  if (text.includes("replace") || text.includes("replacement") || text.includes("tear-off")) {
    return { trade: "Roofing", subtrade: "Residential Replacement" };
  }

  return { trade: "Roofing", subtrade: "Residential Replacement" };
}

export function extractStateFromAddress(address?: string | null): string {
  if (!address) return "UNKNOWN";

  const m = address.match(/,\s*([A-Z]{2})\s*\d{5}/);
  if (m?.[1]) return m[1];

  const mAlt = address.match(/,\s*([A-Z]{2})\b/);
  if (mAlt?.[1]) return mAlt[1];

  return "UNKNOWN";
}

export function computeScopeScore(present: string[], required: string[]): number {
  if (!required.length) return 100;
  const matched = required.filter((r) =>
    present.some((p) => p.toLowerCase().includes(r.toLowerCase()))
  ).length;

  return Math.round((matched / required.length) * 100);
}

export function computePriceScore(
  value: number,
  low: number,
  mid: number,
  high: number
): number {
  if (!value || !low || !high) return 0;

  if (value >= low && value <= high) {
    const distance = Math.abs(value - mid);
    const range = (high - low) / 2;
    const score = 100 - (distance / range) * 20;
    return Math.max(70, Math.round(score));
  }

  if (value < low) {
    const delta = (low - value) / low;
    return Math.max(40, Math.round(70 - delta * 30));
  }

  if (value > high) {
    const delta = (value - high) / high;
    return Math.max(20, Math.round(70 - delta * 40));
  }

  return 50;
}

export function computeRiskLevel(
  scopeScore: number | null,
  priceScore: number | null,
  clarityScore: number | null
): "low" | "medium" | "high" {
  const scores = [scopeScore, priceScore, clarityScore].filter(
    (v): v is number => typeof v === "number"
  );

  if (!scores.length) return "medium";

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 85) return "low";
  if (avg >= 65) return "medium";
  return "high";
}
