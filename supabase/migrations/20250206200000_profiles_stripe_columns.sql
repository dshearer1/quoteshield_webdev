-- Add Stripe-related columns to profiles for billing portal and subscription.
-- submissions table keeps its existing stripe_session_id; profiles stores user-level Stripe data.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_session_id text;

comment on column public.profiles.stripe_customer_id is 'Stripe customer id (cus_...) for billing portal';
comment on column public.profiles.stripe_subscription_id is 'Stripe subscription id (sub_...) if subscribed';
comment on column public.profiles.stripe_session_id is 'Last checkout session id for this user';
