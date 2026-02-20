-- Link submissions to authenticated user (Supabase auth.users id or Cognito sub)
alter table public.submissions
  add column if not exists user_id text;

create index if not exists submissions_user_id_idx on public.submissions (user_id);
