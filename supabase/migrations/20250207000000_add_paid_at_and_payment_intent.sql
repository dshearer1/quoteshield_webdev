-- Add paid_at and stripe_payment_intent for webhook idempotency and audit
alter table public.submissions
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_payment_intent text;

create index if not exists submissions_stripe_payment_intent_idx on public.submissions (stripe_payment_intent);
