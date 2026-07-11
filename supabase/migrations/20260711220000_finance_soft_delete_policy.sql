-- Permanent persistence policy: Budget and Insurance records are soft-deleted.
-- Data must remain recoverable unless a user explicitly confirms permanent removal.

alter table if exists public.finance_budget_records
  add column if not exists deleted_at timestamptz;

create index if not exists finance_budget_records_active_user_sort_idx
  on public.finance_budget_records (user_id, sort_order asc, created_at asc)
  where deleted_at is null;

alter table if exists public.finance_insurance_policies
  add column if not exists deleted_at timestamptz;

create index if not exists finance_insurance_policies_active_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc)
  where deleted_at is null;

notify pgrst, 'reload schema';
