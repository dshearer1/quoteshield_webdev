-- Project context columns for better AI analysis (location, contractor, value)
alter table public.submissions
  add column if not exists address text,
  add column if not exists customer_name text,
  add column if not exists contractor_name text,
  add column if not exists contractor_email text,
  add column if not exists project_value numeric;
