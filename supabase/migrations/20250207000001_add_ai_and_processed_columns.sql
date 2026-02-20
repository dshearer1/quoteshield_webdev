-- AI analysis and processing audit fields for /api/process
alter table public.submissions
  add column if not exists ai_result jsonb,
  add column if not exists ai_confidence text,
  add column if not exists ai_error text,
  add column if not exists processed_at timestamptz;

-- Status flow: paid -> processing -> complete | failed (enforced in app).
