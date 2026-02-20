-- Allow users to read their own submissions (for dashboard)
create policy "Users can read own submissions"
  on public.submissions
  for select
  using (user_id = auth.uid()::text);
