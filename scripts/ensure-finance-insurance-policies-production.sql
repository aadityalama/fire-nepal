-- FIRE Nepal: ensure finance_insurance_policies exists (single production table).
-- Idempotent. Safe to re-run. Reloads PostgREST schema cache at the end.
--
-- Production project: https://mnxxcewvgnohsavojdzu.supabase.co
-- Schema: public
-- Table: finance_insurance_policies
-- There are NO other insurance tables (insurance_policies / user_insurance / etc.).

create table if not exists public.finance_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insurance_type text not null check (
    insurance_type in ('health', 'life', 'critical_illness', 'travel', 'vehicle', 'property', 'other')
  ),
  provider text not null,
  coverage_amount_npr numeric(16, 2) not null default 0 check (coverage_amount_npr >= 0),
  premium_npr numeric(14, 2) not null default 0 check (premium_npr >= 0),
  payment_frequency text not null default 'yearly',
  start_date date,
  expiry_date date,
  policy_term_years integer not null default 0 check (policy_term_years >= 0),
  nominee text,
  family_members_covered jsonb not null default '[]'::jsonb,
  notes text,
  agent_name text,
  agent_phone text,
  branch text,
  policy_number text,
  proposal_number text,
  pan text,
  pan_number text,
  medical_notes text,
  documents jsonb not null default '[]'::jsonb,
  premium_history jsonb not null default '[]'::jsonb,
  total_installments integer not null default 0 check (total_installments >= 0),
  installments_paid integer not null default 0 check (installments_paid >= 0),
  installments_remaining integer not null default 0 check (installments_remaining >= 0),
  total_premium_paid numeric(16, 2) not null default 0,
  remaining_premium numeric(16, 2) not null default 0,
  next_premium_date date,
  next_premium_amount numeric(14, 2) not null default 0,
  document_data_url text,
  document_file_name text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payment frequency (include half_yearly for Policy Tracker).
alter table public.finance_insurance_policies
  drop constraint if exists finance_insurance_policies_payment_frequency_check;

alter table public.finance_insurance_policies
  add constraint finance_insurance_policies_payment_frequency_check
  check (payment_frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'));

-- Additive columns for older partial installs.
alter table public.finance_insurance_policies add column if not exists policy_term_years integer not null default 0;
alter table public.finance_insurance_policies add column if not exists agent_name text;
alter table public.finance_insurance_policies add column if not exists agent_phone text;
alter table public.finance_insurance_policies add column if not exists branch text;
alter table public.finance_insurance_policies add column if not exists policy_number text;
alter table public.finance_insurance_policies add column if not exists proposal_number text;
alter table public.finance_insurance_policies add column if not exists pan text;
alter table public.finance_insurance_policies add column if not exists pan_number text;
alter table public.finance_insurance_policies add column if not exists medical_notes text;
alter table public.finance_insurance_policies add column if not exists documents jsonb not null default '[]'::jsonb;
alter table public.finance_insurance_policies add column if not exists premium_history jsonb not null default '[]'::jsonb;
alter table public.finance_insurance_policies add column if not exists total_installments integer not null default 0;
alter table public.finance_insurance_policies add column if not exists installments_paid integer not null default 0;
alter table public.finance_insurance_policies add column if not exists installments_remaining integer not null default 0;
alter table public.finance_insurance_policies add column if not exists total_premium_paid numeric(16, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists remaining_premium numeric(16, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists next_premium_date date;
alter table public.finance_insurance_policies add column if not exists next_premium_amount numeric(14, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists deleted_at timestamptz;

create index if not exists finance_insurance_policies_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc);

create index if not exists finance_insurance_policies_active_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc)
  where deleted_at is null;

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
