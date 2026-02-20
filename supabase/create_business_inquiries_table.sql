-- Run in Supabase Dashboard → SQL Editor.
-- Stores business/professional inquiry form submissions.

create table if not exists public.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text null,
  email text not null,
  inquiry_type text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'closed')),
  created_at timestamptz default now() not null
);

create index if not exists idx_business_inquiries_created_at on public.business_inquiries(created_at desc);
create index if not exists idx_business_inquiries_status on public.business_inquiries(status);

alter table public.business_inquiries enable row level security;

-- Allow anyone (anon or authenticated) to insert.
create policy "Anyone can insert business_inquiries"
  on public.business_inquiries for insert
  to public
  with check (true);

-- No select/update/delete for anon or authenticated; only service role (admin) can read.
-- Do not create a select policy for public or authenticated.
