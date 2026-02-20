-- Free scan result (limited preview before payment)
alter table public.submissions
  add column if not exists free_scan_json jsonb;
