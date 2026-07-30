-- FIRE Nepal: Policy Management fields for finance_insurance_policies.
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Additive + idempotent so existing policies migrate safely.

alter table public.finance_insurance_policies
  add column if not exists policy_term_years integer not null default 0;

alter table public.finance_insurance_policies
  add column if not exists agent_name text;

alter table public.finance_insurance_policies
  add column if not exists agent_phone text;

alter table public.finance_insurance_policies
  add column if not exists branch text;

alter table public.finance_insurance_policies
  add column if not exists policy_number text;

alter table public.finance_insurance_policies
  add column if not exists proposal_number text;

alter table public.finance_insurance_policies
  add column if not exists pan text;

alter table public.finance_insurance_policies
  add column if not exists medical_notes text;

alter table public.finance_insurance_policies
  add column if not exists documents jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'finance_insurance_policies_policy_term_years_check'
  ) then
    alter table public.finance_insurance_policies
      add constraint finance_insurance_policies_policy_term_years_check
      check (policy_term_years >= 0);
  end if;
end $$;

-- Backfill documents[] from legacy single attachment columns without wiping notes.
update public.finance_insurance_policies
set documents = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'kind', 'policy_pdf',
    'fileName', coalesce(document_file_name, 'policy-document'),
    'dataUrl', document_data_url,
    'uploadedAt', coalesce(updated_at, created_at, now())
  )
)
where document_data_url is not null
  and document_data_url <> ''
  and (
    documents is null
    or documents = '[]'::jsonb
    or jsonb_typeof(documents) <> 'array'
  );

-- Derive term years from start/expiry when missing.
update public.finance_insurance_policies
set policy_term_years = greatest(
  1,
  round(
    (
      extract(epoch from (expiry_date::timestamp - start_date::timestamp))
      / (365.25 * 24 * 60 * 60)
    )::numeric
  )::integer
)
where policy_term_years = 0
  and start_date is not null
  and expiry_date is not null
  and expiry_date > start_date;

notify pgrst, 'reload schema';
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
