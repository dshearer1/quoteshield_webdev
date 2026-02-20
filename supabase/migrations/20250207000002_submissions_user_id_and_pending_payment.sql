-- Add 'pending_payment' status so logged-in users get submissions linked before Stripe redirect.
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.submissions'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if cname is not null then
    execute format('alter table public.submissions drop constraint %I', cname);
  end if;
end $$;
alter table public.submissions add constraint submissions_status_check
  check (status in ('draft', 'pending_payment', 'paid', 'processing', 'complete', 'failed'));
