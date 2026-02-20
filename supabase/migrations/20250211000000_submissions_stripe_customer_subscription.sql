-- Store Stripe customer/subscription on submission for webhook sync (session already exists).
alter table public.submissions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;
