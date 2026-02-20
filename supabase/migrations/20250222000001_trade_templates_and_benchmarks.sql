-- trade_templates: scope checklist per trade/subtrade for deterministic scoring
create table if not exists public.trade_templates (
  id uuid primary key default gen_random_uuid(),
  trade text not null,
  subtrade text not null,
  scope_checklist jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trade, subtrade)
);

-- pricing_benchmarks: state-level (region_key) benchmarks for price scoring
create table if not exists public.pricing_benchmarks (
  id uuid primary key default gen_random_uuid(),
  trade text not null,
  subtrade text not null,
  region_key text not null,
  low numeric not null,
  mid numeric,
  high numeric not null,
  unit_basis text,
  source text,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trade, subtrade, region_key)
);

create index if not exists idx_trade_templates_trade_subtrade on public.trade_templates(trade, subtrade);
create index if not exists idx_pricing_benchmarks_lookup on public.pricing_benchmarks(trade, subtrade, region_key);
