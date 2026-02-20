-- Phone number and text (SMS) notification preference for profiles.
alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists text_notifications boolean not null default false;

comment on column public.profiles.phone_number is 'E.164 or national format for SMS';
comment on column public.profiles.text_notifications is 'Opt-in to receive text notifications (e.g. report ready)';
