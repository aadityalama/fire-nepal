-- FIRE Nepal: make portfolio RLS command-specific and self-owned.
-- The app currently stores portfolio accounts in module tables plus
-- portfolio_extensions. The legacy/requested portfolio tables are hardened too
-- if they exist in a live database.

do $$
declare
  portfolio_table text;
  policy_prefix text;
begin
  foreach portfolio_table in array array[
    'bank_accounts',
    'investments',
    'gold_assets',
    'real_estate',
    'vehicles',
    'liabilities',
    'retirement_assets',
    'portfolio_extensions',
    'portfolios',
    'portfolio_accounts',
    'transactions'
  ]
  loop
    if to_regclass(format('public.%I', portfolio_table)) is not null then
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = portfolio_table
          and column_name = 'user_id'
      ) then
        policy_prefix := portfolio_table || '_self';

        execute format('alter table public.%I enable row level security', portfolio_table);

        execute format('drop policy if exists %I on public.%I', policy_prefix, portfolio_table);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_select', portfolio_table);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_insert', portfolio_table);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_update', portfolio_table);
        execute format('drop policy if exists %I on public.%I', policy_prefix || '_delete', portfolio_table);

        execute format(
          'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
          policy_prefix || '_select',
          portfolio_table
        );
        execute format(
          'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
          policy_prefix || '_insert',
          portfolio_table
        );
        execute format(
          'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
          policy_prefix || '_update',
          portfolio_table
        );
        execute format(
          'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
          policy_prefix || '_delete',
          portfolio_table
        );
      else
        raise notice 'Skipping %.% RLS policy refresh: user_id column not found', 'public', portfolio_table;
      end if;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
