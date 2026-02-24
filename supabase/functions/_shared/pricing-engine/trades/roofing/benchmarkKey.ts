/**
 * Benchmark lookup key for roofing (trade, subtrade, unit_basis).
 */

export type RoofingBenchmarkKey = {
  trade: string;
  subtrade: string;
  unit_basis: string;
};

export function getRoofingBenchmarkKey(_params: {
  projectType?: string | null;
}): RoofingBenchmarkKey {
  return {
    trade: "Roofing",
    subtrade: "Residential Replacement",
    unit_basis: "square",
  };
}
