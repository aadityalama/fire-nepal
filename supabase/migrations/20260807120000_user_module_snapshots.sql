-- Generic authenticated module snapshots (Supabase SoT for modules without dedicated tables).
-- Used by: return_to_nepal, smart_loan, fire_lending, ssf_pension, pension_slips,
-- nepal_col, payslip_history, family_hub, financial_intel_rollups.

create table if not exists public.user_module_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  module_key text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

create index if not exists user_module_snapshots_updated_idx
  on public.user_module_snapshots (updated_at desc);

alter table public.user_module_snapshots enable row level security;

drop policy if exists "user_module_snapshots_self" on public.user_module_snapshots;
create policy "user_module_snapshots_self"
  on public.user_module_snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_module_snapshots to authenticated;
grant select, insert, update, delete on public.user_module_snapshots to service_role;

create or replace function public.set_user_module_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_module_snapshots_updated_at on public.user_module_snapshots;
create trigger user_module_snapshots_updated_at
  before update on public.user_module_snapshots
  for each row
  execute function public.set_user_module_snapshots_updated_at();

notify pgrst, 'reload schema';
