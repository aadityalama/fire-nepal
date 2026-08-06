-- Ensure Group Expenses member persistence columns/policies remain visible to PostgREST.
-- Root cause fix is application-side (load/save group_members), but this migration
-- re-asserts the durable member name storage contract used by Group Expenses.

alter table public.group_members
  alter column local_member_id set not null,
  alter column name set not null,
  alter column workspace_id set not null,
  alter column user_id set not null;

create unique index if not exists group_members_workspace_local_uidx
  on public.group_members (workspace_id, local_member_id)
  where deleted_at is null;

create index if not exists group_members_workspace_idx
  on public.group_members (workspace_id, sort_order);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_expenses to authenticated;
grant select, insert, update, delete on public.settlements to authenticated;

alter table public.group_members enable row level security;

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

notify pgrst, 'reload schema';
