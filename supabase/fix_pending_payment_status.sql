-- Run this in Supabase Dashboard → SQL Editor if you see
-- "new row for relation \"submissions\" violates check constraint \"submissions_status_check\"."
-- Idempotent: safe to run more than once.

do $$
declare
  cname text;
begin
  -- Drop existing status check constraint (name may be submissions_status_check or auto-generated)
  select conname into cname
  from pg_constraint
  where conrelid = 'public.submissions'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if cname is not null then
    execute format('alter table public.submissions drop constraint if exists %I', cname);
  end if;
end $$;

alter table public.submissions drop constraint if exists submissions_status_check;

alter table public.submissions add constraint submissions_status_check
  check (status in ('draft', 'pending_payment', 'paid', 'processing', 'complete', 'failed'));
