-- Faster benchmark lookup by trade/subtrade/region/unit_basis
create index if not exists pricing_benchmarks_lookup_idx
  on public.pricing_benchmarks (trade, subtrade, region_key, unit_basis);

-- Faster line item reads by submission and sort order
create index if not exists submission_line_items_submission_sort_idx
  on public.submission_line_items (submission_id, sort_order);
