-- FIRE Nepal: Persist premium tracker + history for insurance policies.
-- Additive / idempotent. Existing start_date / payment_frequency / premium_npr /
-- nominee / documents / agent fields remain the source of truth for those concepts:
--   start_date        ↔ policy_start_date
--   payment_frequency ↔ premium_frequency
--   premium_npr       ↔ premium_amount
--   pan               ↔ pan_number (also mirrored below)

alter table public.finance_insurance_policies
  add column if not exists pan_number text;

alter table public.finance_insurance_policies
  add column if not exists total_installments integer not null default 0;

alter table public.finance_insurance_policies
  add column if not exists installments_paid integer not null default 0;

alter table public.finance_insurance_policies
  add column if not exists installments_remaining integer not null default 0;

alter table public.finance_insurance_policies
  add column if not exists total_premium_paid numeric(16, 2) not null default 0;

alter table public.finance_insurance_policies
  add column if not exists remaining_premium numeric(16, 2) not null default 0;

alter table public.finance_insurance_policies
  add column if not exists next_premium_date date;

alter table public.finance_insurance_policies
  add column if not exists next_premium_amount numeric(14, 2) not null default 0;

alter table public.finance_insurance_policies
  add column if not exists premium_history jsonb not null default '[]'::jsonb;

-- Mirror legacy pan → pan_number without wiping either side.
update public.finance_insurance_policies
set pan_number = pan
where pan_number is null
  and pan is not null
  and pan <> '';

update public.finance_insurance_policies
set pan = pan_number
where (pan is null or pan = '')
  and pan_number is not null
  and pan_number <> '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'finance_insurance_policies_total_installments_check'
  ) then
    alter table public.finance_insurance_policies
      add constraint finance_insurance_policies_total_installments_check
      check (total_installments >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'finance_insurance_policies_installments_paid_check'
  ) then
    alter table public.finance_insurance_policies
      add constraint finance_insurance_policies_installments_paid_check
      check (installments_paid >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'finance_insurance_policies_installments_remaining_check'
  ) then
    alter table public.finance_insurance_policies
      add constraint finance_insurance_policies_installments_remaining_check
      check (installments_remaining >= 0);
  end if;
end $$;

notify pgrst, 'reload schema';
