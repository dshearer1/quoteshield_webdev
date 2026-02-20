-- pricing_benchmarks: add unit-based columns for $/square comparison
alter table public.pricing_benchmarks
  add column if not exists unit_low numeric,
  add column if not exists unit_mid numeric,
  add column if not exists unit_high numeric;

-- submission_analysis: add unit normalization columns
alter table public.submission_analysis
  add column if not exists unit_basis text,
  add column if not exists normalized_quantity numeric,
  add column if not exists unit_price_estimated numeric;
