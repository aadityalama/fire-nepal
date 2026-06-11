-- FIRE Nepal: harden finance tables so authenticated users can only read/write
-- their own dashboard records. This migration is idempotent and skips legacy
-- table names that are not present in a given environment.

do $$
declare
  finance_table text;
begin
  foreach finance_table in array array[
    'assets',
    'liabilities',
    'income',
    'expenses',
    'transactions',
    'workspaces',
    'bank_accounts',
    'investments',
    'gold_assets',
    'real_estate',
    'vehicles',
    'retirement_assets',
    'portfolio_extensions'
  ]
  loop
    if to_regclass(format('public.%I', finance_table)) is not null then
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = finance_table
          and column_name = 'user_id'
      ) then
        execute format('alter table public.%I enable row level security', finance_table);

        execute format('drop policy if exists user_select on public.%I', finance_table);
        execute format('drop policy if exists user_insert on public.%I', finance_table);
        execute format('drop policy if exists user_update on public.%I', finance_table);
        execute format('drop policy if exists user_delete on public.%I', finance_table);

        execute format(
          'create policy user_select on public.%I for select to authenticated using (auth.uid() = user_id)',
          finance_table
        );
        execute format(
          'create policy user_insert on public.%I for insert to authenticated with check (auth.uid() = user_id)',
          finance_table
        );
        execute format(
          'create policy user_update on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
          finance_table
        );
        execute format(
          'create policy user_delete on public.%I for delete to authenticated using (auth.uid() = user_id)',
          finance_table
        );
      else
        raise notice 'Skipping public.%: user_id column not found', finance_table;
      end if;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
