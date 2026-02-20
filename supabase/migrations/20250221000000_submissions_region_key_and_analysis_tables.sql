-- region_key for submissions (state code initially; later zip3/county)
alter table public.submissions
  add column if not exists region_key text;

-- submission_line_items for line-item breakdown (paid users)
create table if not exists public.submission_line_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  category text,
  description_raw text,
  description_normalized text,
  quantity numeric,
  unit text,
  unit_price numeric,
  line_total numeric,
  confidence numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_submission_line_items_submission_id on public.submission_line_items(submission_id);

-- submission_analysis for deterministic scores + flags (replaces AI-only conversion)
create table if not exists public.submission_analysis (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  trade text,
  subtrade text,
  region_key text,
  scope_score int,
  price_score int,
  clarity_score int,
  company_score int,
  risk_level text,
  flags jsonb,
  benchmark_snapshot jsonb,
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
