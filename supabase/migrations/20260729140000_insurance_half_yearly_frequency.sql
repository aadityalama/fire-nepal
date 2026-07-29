-- Allow half-yearly premium frequency for insurance policies.
-- Existing monthly/quarterly/yearly/one_time rows remain valid.

alter table public.finance_insurance_policies
  drop constraint if exists finance_insurance_policies_payment_frequency_check;

alter table public.finance_insurance_policies
  add constraint finance_insurance_policies_payment_frequency_check
  check (
    payment_frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time')
  );

notify pgrst, 'reload schema';
