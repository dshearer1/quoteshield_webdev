/**
 * Fetch pricing benchmark for trade/subtrade/region_key.
 * For price-per-square we standardize on unit_basis = 'square'.
 * ALWAYS use unit_low/unit_mid/unit_high if not null, else fallback to low/mid/high.
 */

export type BenchmarkResult = {
  unit_low: number | null;
  unit_mid: number | null;
  unit_high: number | null;
  source: string | null;
  effective_date: string | null;
  /** Raw row for benchmark_snapshot */
  benchmark_row: Record<string, unknown>;
};

/** Standard unit_basis for roofing $/square. */
export const UNIT_BASIS_SQUARE = "square";

export async function fetchUnitBenchmark(params: {
  supabase: unknown;
  trade: string;
  subtrade: string;
  region_key: string;
  unit_basis: string;
}): Promise<BenchmarkResult> {
  const { supabase, trade, subtrade, region_key, unit_basis } = params;

  const cols = "unit_low, unit_mid, unit_high, low, mid, high, source, effective_date, unit_basis, trade, subtrade, region_key";
  // deno-lint-ignore no-explicit-any
  const sb = supabase as any;
  let data: unknown = null;
  let error: unknown = null;
  const { data: dataMatch, error: errMatch } = await sb
    .from("pricing_benchmarks")
    .select(cols)
    .eq("trade", trade)
    .eq("subtrade", subtrade)
    .eq("region_key", region_key)
    .eq("unit_basis", unit_basis)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  data = dataMatch;
  error = errMatch;
  if ((error || !data) && region_key !== "unknown") {
    const { data: dataFallback } = await sb
      .from("pricing_benchmarks")
      .select(cols)
      .eq("trade", trade)
      .eq("subtrade", subtrade)
      .eq("region_key", region_key)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (dataFallback) data = dataFallback;
  }

  if (error || !data) {
    return {
      unit_low: null,
      unit_mid: null,
      unit_high: null,
      source: null,
      effective_date: null,
      benchmark_row: {},
    };
  }

  const row = data as Record<string, unknown>;
  const low = row.low != null ? Number(row.low) : null;
  const mid = row.mid != null ? Number(row.mid) : null;
  const high = row.high != null ? Number(row.high) : null;
  const unit_low = row.unit_low != null ? Number(row.unit_low) : low;
  const unit_mid = row.unit_mid != null ? Number(row.unit_mid) : mid;
  const unit_high = row.unit_high != null ? Number(row.unit_high) : high;

  return {
    unit_low: unit_low != null && Number.isFinite(unit_low) ? unit_low : null,
    unit_mid: unit_mid != null && Number.isFinite(unit_mid) ? unit_mid : null,
    unit_high: unit_high != null && Number.isFinite(unit_high) ? unit_high : null,
    source: (row.source as string) ?? null,
    effective_date: (row.effective_date as string) ?? null,
    benchmark_row: { ...row },
  };
}
