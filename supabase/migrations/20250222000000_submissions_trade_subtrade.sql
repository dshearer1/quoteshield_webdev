-- Add trade and subtrade to submissions for quick display (denormalized from submission_analysis)
alter table public.submissions
  add column if not exists trade text,
  add column if not exists subtrade text;
