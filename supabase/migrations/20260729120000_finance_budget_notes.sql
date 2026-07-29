-- Optional notes on personal finance budgets (max enforced in app at 500 chars).

alter table public.finance_budget_records
  add column if not exists notes text not null default '';

comment on column public.finance_budget_records.notes is 'Optional user notes for a budget category (app-enforced max 500 chars).';

notify pgrst, 'reload schema';
