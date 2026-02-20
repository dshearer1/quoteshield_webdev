-- Table: negotiation_responses
-- Stores AI analysis of contractor follow-up responses (negotiation loop).

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

create index idx_negotiation_responses_submission_id on public.negotiation_responses(submission_id);
create index idx_negotiation_responses_user_id on public.negotiation_responses(user_id);
create index idx_negotiation_responses_created_at on public.negotiation_responses(created_at desc);

alter table public.negotiation_responses enable row level security;

-- SELECT: authenticated users can read their own rows
create policy "Users can select own negotiation_responses"
  on public.negotiation_responses for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: authenticated users can insert rows where user_id = auth.uid()
create policy "Users can insert own negotiation_responses"
  on public.negotiation_responses for insert
  to authenticated
  with check (auth.uid() = user_id);
