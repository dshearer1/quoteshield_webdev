-- Ensure public.submissions.user_id is uuid referencing auth.users(id) for correct RLS and dashboard linking.

drop policy if exists "Users can read own submissions" on public.submissions;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'user_id'
  ) then
    -- Column exists (as text from 20250208000000): convert to uuid, then add FK
    alter table public.submissions
      alter column user_id type uuid
      using (case
        when user_id is not null and user_id ~ '^[0-9a-fA-F-]{36}$' then user_id::uuid
        else null
      end);
    alter table public.submissions
      add constraint fk_submissions_user
      foreign key (user_id) references auth.users(id);
  else
    -- Column missing: add as uuid with FK
    alter table public.submissions
      add column user_id uuid references auth.users(id);
    create index if not exists submissions_user_id_idx on public.submissions (user_id);
  end if;
end $$;

create policy "Users can read own submissions"
  on public.submissions for select
  using (user_id = auth.uid());
