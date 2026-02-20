-- Phase 1: Projects (group submissions under a project)
alter table public.submissions
  add column if not exists project_id uuid,
  add column if not exists quote_type text;

create index if not exists submissions_project_id_idx on public.submissions(project_id);

comment on column public.submissions.project_id is 'Groups submissions into a project; null = legacy single submission';
comment on column public.submissions.quote_type is 'original | revised | comparison';
