-- FIRE Nepal: insurance policies (authenticated users only).

create table if not exists public.finance_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insurance_type text not null check (
    insurance_type in ('health', 'life', 'critical_illness', 'travel', 'vehicle', 'property', 'other')
  ),
  provider text not null,
  coverage_amount_npr numeric(16, 2) not null default 0 check (coverage_amount_npr >= 0),
  premium_npr numeric(14, 2) not null default 0 check (premium_npr >= 0),
  payment_frequency text not null default 'yearly' check (
    payment_frequency in ('monthly', 'quarterly', 'yearly', 'one_time')
  ),
  start_date date,
  expiry_date date,
  nominee text,
  family_members_covered jsonb not null default '[]'::jsonb,
  notes text,
  document_data_url text,
  document_file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_insurance_policies_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc);

alter table public.finance_insurance_policies enable row level security;

drop policy if exists "Users read own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users insert own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users update own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users delete own finance insurance policies" on public.finance_insurance_policies;

create policy "Users read own finance insurance policies"
  on public.finance_insurance_policies for select
  using (auth.uid() = user_id);

create policy "Users insert own finance insurance policies"
  on public.finance_insurance_policies for insert
  with check (auth.uid() = user_id);

create policy "Users update own finance insurance policies"
  on public.finance_insurance_policies for update
  using (auth.uid() = user_id);

create policy "Users delete own finance insurance policies"
  on public.finance_insurance_policies for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
