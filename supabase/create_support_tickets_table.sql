-- Run in Supabase Dashboard → SQL Editor.
-- Stores support ticket submissions from the Contact Support form.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  submission_public_id text null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now() not null
);

create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id) where user_id is not null;

alter table public.support_tickets enable row level security;

-- Authenticated users may insert their own ticket (email or user_id match).
create policy "Users can insert own support_tickets"
  on public.support_tickets for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users may select only their own tickets.
create policy "Users can select own support_tickets"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id);

-- Service role (API) bypasses RLS for inserts from the support form (no auth required for submission).
