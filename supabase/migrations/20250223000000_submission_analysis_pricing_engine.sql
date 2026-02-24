-- submission_analysis: columns for pricing engine output (UI reads these only)
alter table public.submission_analysis
  add column if not exists pricing_position text,
  add column if not exists job_units numeric,
  add column if not exists job_unit_name text,
  add column if not exists effective_unit_price numeric,
  add column if not exists pricing_engine_result jsonb,
  add column if not exists pricing_confidence numeric;
