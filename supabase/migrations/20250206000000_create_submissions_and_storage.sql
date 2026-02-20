-- QuoteShield: submissions table
-- Create a private storage bucket named "quotes" in Supabase Dashboard (Storage → New bucket → name: quotes, public: off)

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  project_type text,
  project_notes text,
  file_path text,
  status text not null default 'draft' check (status in ('draft', 'paid', 'processing', 'complete', 'failed')),
  stripe_session_id text,
  report_json jsonb,
  report_html text,
  token text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists submissions_token_idx on public.submissions (token);
create index if not exists submissions_stripe_session_id_idx on public.submissions (stripe_session_id);

alter table public.submissions enable row level security;

create policy "No direct public access"
  on public.submissions
  for all
  using (false)
  with check (false);
