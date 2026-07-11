-- Group Expenses History PostgREST visibility.
-- Keeps RLS as the access control layer while allowing authenticated clients
-- to see the Group Expenses tables in the PostgREST schema cache.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_expenses to authenticated;
grant select, insert, update, delete on public.settlements to authenticated;

notify pgrst, 'reload schema';
