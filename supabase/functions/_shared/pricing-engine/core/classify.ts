/**
 * Classify pricing position from effective unit price vs benchmark low/mid/high.
 * Spec: effective <= mid → Within; mid < effective <= high → Above (Review); effective > high → Significantly Above; effective < low → Below (Good Deal).
 * Also computes delta_vs_mid and estimated overage amounts.
 */

export type ClassifyResult = {
  pricing_position: string;
  pricing_position_label: string;
  pricing_confidence: number;
  delta_vs_mid: number | null;
  estimated_overage_mid: number | null;
  estimated_overage_high: number | null;
  pct_vs_midpoint: number | null;
};

export function classifyPricing(params: {
  effectiveUnitPrice: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  job_units: number | null;
}): ClassifyResult {
  const { effectiveUnitPrice, low, mid, high, job_units } = params;

  const midVal = mid != null && Number.isFinite(mid) ? mid : (low != null && high != null && Number.isFinite(low) && Number.isFinite(high) ? (low + high) / 2 : null);

  if (
    effectiveUnitPrice == null ||
    !Number.isFinite(effectiveUnitPrice) ||
    low == null ||
    high == null ||
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    midVal == null
  ) {
    return {
      pricing_position: "within_expected_range",
      pricing_position_label: "Within Expected Range",
      pricing_confidence: 0,
      delta_vs_mid: null,
      estimated_overage_mid: null,
      estimated_overage_high: null,
      pct_vs_midpoint: null,
    };
  }

  const delta_vs_mid = (effectiveUnitPrice - midVal) / midVal;
  const pct_vs_midpoint = Math.round(delta_vs_mid * 1000) / 10;
  const jobUnits = job_units != null && Number.isFinite(job_units) && job_units > 0 ? job_units : 0;
  const estimated_overage_mid = Math.max(0, (effectiveUnitPrice - midVal) * jobUnits);
  const estimated_overage_high = Math.max(0, (effectiveUnitPrice - high) * jobUnits);

  let pricing_position_label: string;
  let pricing_confidence: number;

  if (effectiveUnitPrice < low) {
    pricing_position_label = "Below Market Range (Potential Good Deal)";
    pricing_confidence = 0.75;
  } else if (effectiveUnitPrice <= midVal) {
    pricing_position_label = "Within Expected Range";
    pricing_confidence = 0.85;
  } else if (effectiveUnitPrice <= high) {
    pricing_position_label = "Above Market Range (Review Recommended)";
    pricing_confidence = 0.8;
  } else {
    pricing_position_label = "Significantly Above Market (Investigation Recommended)";
    pricing_confidence = 0.8;
  }

  return {
    pricing_position: pricing_position_label,
    pricing_position_label,
    pricing_confidence,
    delta_vs_mid: Math.round(delta_vs_mid * 10000) / 10000,
    estimated_overage_mid: Math.round(estimated_overage_mid * 100) / 100,
    estimated_overage_high: Math.round(estimated_overage_high * 100) / 100,
    pct_vs_midpoint,
  };
}
