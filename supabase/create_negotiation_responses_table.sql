-- Run this in Supabase Dashboard → SQL Editor (hosted project).
-- Creates negotiation_responses table, indexes, and RLS so the API can save contractor response analyses.

-- Table: negotiation_responses
create table if not exists public.negotiation_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz default now() not null,
  contractor_response_text text not null,
  homeowner_questions text,
  ai_json jsonb,
  status text not null default 'complete' check (status in ('processing', 'complete', 'failed')),
  ai_error text
);

-- Indexes
create index if not exists idx_negotiation_responses_submission_id on public.negotiation_responses(submission_id);
create index if not exists idx_negotiation_responses_user_id on public.negotiation_responses(user_id);
create index if not exists idx_negotiation_responses_created_at on public.negotiation_responses(created_at desc);

-- RLS
alter table public.negotiation_responses enable row level security;

-- Policies (drop first so script is safe to re-run)
drop policy if exists "Users can select own negotiation_responses" on public.negotiation_responses;
drop policy if exists "Users can insert own negotiation_responses" on public.negotiation_responses;

create policy "Users can select own negotiation_responses"
  on public.negotiation_responses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own negotiation_responses"
  on public.negotiation_responses for insert
  to authenticated
  with check (auth.uid() = user_id);
