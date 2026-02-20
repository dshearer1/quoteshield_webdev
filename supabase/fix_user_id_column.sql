-- Run this in Supabase Dashboard → SQL Editor if you see "column submissions.user_id does not exist".
-- Idempotent: safe to run more than once.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'user_id'
  ) then
    alter table public.submissions
      add column user_id uuid references auth.users(id);
    create index if not exists submissions_user_id_idx on public.submissions (user_id);
    drop policy if exists "Users can read own submissions" on public.submissions;
    create policy "Users can read own submissions"
      on public.submissions for select
      using (user_id = auth.uid());
  end if;
end $$;
