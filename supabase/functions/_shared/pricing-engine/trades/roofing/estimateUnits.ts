/**
 * Estimate roof squares (job_units) and roofing total for effective $/square.
 * Priority: A) submission_analysis.normalized_quantity if unit_basis=square; B) from line items (squares or bundles/3); C) report_json; else cannot compute.
 */

export type LineItemRow = {
  description_raw?: string | null;
  description_normalized?: string | null;
  quantity?: number | null;
  line_total?: number | null;
  unit?: string | null;
  category?: string | null;
};

export type AnalysisContext = {
  unit_basis?: string | null;
  normalized_quantity?: number | null;
};

export type ReportJsonContext = {
  summary?: { total?: number; roof_squares?: number } | null;
  total?: number;
  roof_squares?: number;
};

export type RoofingUnitEstimate = {
  job_units: number | null;
  roofing_scope_total: number | null;
  effective_per_square: number | null;
  confidence: number;
  evidence: string[];
};

function extractSquaresFromText(text: string): number | null {
  const t = text.toLowerCase();
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*squares?\b/);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return (a + b) / 2;
  }
  const single = t.match(/\b(\d+(?:\.\d+)?)\s*squares?\b/);
  if (single) {
    const a = parseFloat(single[1]);
    if (Number.isFinite(a) && a > 0) return a;
  }
  return null;
}

function extractBundlesFromLineItems(lineItems: LineItemRow[]): number | null {
  for (const li of lineItems) {
    const u = (li.unit ?? "").toLowerCase();
    const desc = [li.description_raw, li.description_normalized].filter(Boolean).join(" ").toLowerCase();
    if (u === "bundle" || u === "bundles" || desc.includes("bundle")) {
      const q = li.quantity != null ? Number(li.quantity) : NaN;
      if (Number.isFinite(q) && q > 0) return q;
    }
  }
  const combined = lineItems.map((li) => [li.description_raw, li.description_normalized, li.unit].filter(Boolean).join(" ")).join(" ");
  const m = combined.toLowerCase().match(/\b(\d+(?:\.\d+)?)\s*bundles?\b/);
  if (m) {
    const b = parseFloat(m[1]);
    if (Number.isFinite(b) && b > 0) return b;
  }
  return null;
}

/** Standard unit_basis for price-per-square benchmarks. */
export const UNIT_BASIS_SQUARE = "square";

export function estimateRoofingUnits(params: {
  lineItems: LineItemRow[];
  analysis?: AnalysisContext | null;
  reportJson?: ReportJsonContext | null;
  project_value?: number | null;
}): RoofingUnitEstimate {
  const { lineItems, analysis, reportJson, project_value } = params;
  const evidence: string[] = [];

  let job_units: number | null = null;
  let confidence = 0;

  // A) submission_analysis.unit_basis indicates square AND normalized_quantity exists
  if (analysis?.unit_basis?.toLowerCase() === "square" && analysis.normalized_quantity != null && Number.isFinite(analysis.normalized_quantity) && analysis.normalized_quantity > 0) {
    job_units = Number(analysis.normalized_quantity);
    confidence = 0.9;
    evidence.push(`job_units from analysis: ${job_units}`);
  }

  // B) Compute from line items
  if (job_units == null) {
    const combinedText = lineItems.map((li) => [li.description_raw, li.description_normalized, li.unit].filter(Boolean).join(" ")).join(" ");
    const fromText = extractSquaresFromText(combinedText);
    if (fromText != null) {
      job_units = fromText;
      confidence = 0.8;
      evidence.push(`squares from line item text: ${job_units}`);
    } else {
      const bundles = extractBundlesFromLineItems(lineItems);
      if (bundles != null) {
        job_units = Math.round((bundles / 3) * 100) / 100;
        confidence = 0.7;
        evidence.push(`job_units from bundles/3: ${bundles} bundles → ${job_units} squares`);
      }
    }
  }

  // C) report_json roof_squares or similar
  if (job_units == null && reportJson) {
    const r = reportJson as Record<string, unknown>;
    const summary = r.summary as Record<string, unknown> | undefined;
    const roofSquares = (summary?.roof_squares ?? r.roof_squares) as number | undefined;
    if (roofSquares != null && Number.isFinite(roofSquares) && roofSquares > 0) {
      job_units = Number(roofSquares);
      confidence = 0.7;
      evidence.push(`job_units from report_json: ${job_units}`);
    }
  }

  if (job_units == null) {
    evidence.push("Cannot compute job_units; no squares from analysis, line items, or report.");
    return {
      job_units: null,
      roofing_scope_total: null,
      effective_per_square: null,
      confidence: 0,
      evidence,
    };
  }

  // Roofing scope total: project_value ?? sum(line_total) ?? report_json.total ?? 0
  let roofing_scope_total: number | null = project_value != null && Number.isFinite(project_value) ? Number(project_value) : null;
  if (roofing_scope_total == null) {
    let sum = 0;
    for (const li of lineItems) {
      const lt = li.line_total != null ? Number(li.line_total) : NaN;
      if (Number.isFinite(lt)) sum += lt;
    }
    roofing_scope_total = sum > 0 ? sum : null;
  }
  if (roofing_scope_total == null && reportJson) {
    const r = reportJson as Record<string, unknown>;
    const summary = r.summary as Record<string, unknown> | undefined;
    const total = (summary?.total ?? r.total) as number | undefined;
    if (total != null && Number.isFinite(total)) roofing_scope_total = Number(total);
  }
  if (roofing_scope_total == null) roofing_scope_total = 0;
  evidence.push(`roofing_scope_total: ${roofing_scope_total}`);

  const effective_per_square =
    job_units > 0 && roofing_scope_total > 0 ? Math.round((roofing_scope_total / job_units) * 100) / 100 : null;

  return {
    job_units,
    roofing_scope_total,
    effective_per_square,
    confidence,
    evidence,
  };
}
