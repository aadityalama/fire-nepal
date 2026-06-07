-- Repair / idempotent: membership_requests.amount_npr (submission / approval NPR snapshot).
-- Matches 20250607180000_membership_amount_and_revenue_event_details.sql § membership_requests.
-- Use when PostgREST errors: column membership_requests.amount_npr does not exist.

alter table public.membership_requests
add column if not exists amount_npr numeric(18, 2);

-- Backfill nulls from plan_type (list prices at migration time; aligns with app catalog defaults).
update public.membership_requests
set
  amount_npr = case plan_type
    when 'premium' then 500::numeric
    when 'elite' then 800::numeric
    else null
  end
where
  amount_npr is null;

alter table public.membership_requests
alter column amount_npr
set not null;

alter table public.membership_requests drop constraint if exists membership_requests_amount_npr_positive;

alter table public.membership_requests
add constraint membership_requests_amount_npr_positive check (amount_npr > 0);

notify pgrst, 'reload schema';
