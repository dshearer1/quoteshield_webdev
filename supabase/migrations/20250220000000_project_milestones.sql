-- Project milestones: user-defined milestones and sub-milestones per project
-- For tracking what the contractor promised and getting back on track when issues arise

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  user_id text not null,
  parent_id uuid references public.project_milestones(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_milestones_project_id_idx on public.project_milestones(project_id);
create index if not exists project_milestones_user_id_idx on public.project_milestones(user_id);
create index if not exists project_milestones_parent_id_idx on public.project_milestones(parent_id);

comment on table public.project_milestones is 'User-created milestones and sub-milestones per project; shareable with contractor';
comment on column public.project_milestones.parent_id is 'When set, this row is a sub-milestone of the parent (e.g. for unexpected issues)';

-- RLS: users can only access their own milestones
alter table public.project_milestones enable row level security;

create policy "Users can read own milestones"
  on public.project_milestones for select
  using (user_id = auth.uid()::text);

create policy "Users can insert own milestones"
  on public.project_milestones for insert
  with check (user_id = auth.uid()::text);

create policy "Users can update own milestones"
  on public.project_milestones for update
  using (user_id = auth.uid()::text);

create policy "Users can delete own milestones"
  on public.project_milestones for delete
  using (user_id = auth.uid()::text);

-- Keep updated_at in sync
create or replace function public.set_project_milestones_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger project_milestones_updated_at
  before update on public.project_milestones
  for each row execute function public.set_project_milestones_updated_at();
