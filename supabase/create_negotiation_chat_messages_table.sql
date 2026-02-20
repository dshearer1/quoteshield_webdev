-- Run in Supabase Dashboard → SQL Editor.
-- Stores Negotiation Assistant chat messages (user + assistant) per submission.

create table if not exists public.negotiation_chat_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message_text text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_negotiation_chat_messages_submission_id on public.negotiation_chat_messages(submission_id);
create index if not exists idx_negotiation_chat_messages_created_at on public.negotiation_chat_messages(submission_id, created_at asc);

alter table public.negotiation_chat_messages enable row level security;

-- Allow read/insert only for rows tied to submissions the user owns (via submission_id → submissions.user_id).
-- Service role can bypass; anon/authenticated need a policy that joins to submissions.
create policy "Users can select own negotiation_chat_messages"
  on public.negotiation_chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.submissions s
      where s.id = negotiation_chat_messages.submission_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert own negotiation_chat_messages"
  on public.negotiation_chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = negotiation_chat_messages.submission_id and s.user_id = auth.uid()
    )
  );

-- Service role (API) will use service_role key which bypasses RLS, so no policy needed for backend.
