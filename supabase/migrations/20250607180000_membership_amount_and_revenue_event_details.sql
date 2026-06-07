-- Snapshot NPR amount on each membership request (price at submission time).
-- Revenue ledger columns for membership approvals (no hardcoded amounts at approval).

-- ---------------------------------------------------------------------------
-- membership_requests.amount_npr
-- ---------------------------------------------------------------------------
alter table public.membership_requests
add column if not exists amount_npr numeric(18, 2);

-- One-time fill for legacy rows (historical catalog at migration time).
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

-- ---------------------------------------------------------------------------
-- revenue_events: membership approval details
-- ---------------------------------------------------------------------------
alter table public.revenue_events
add column if not exists membership_request_id uuid references public.membership_requests (id) on delete set null;

alter table public.revenue_events
add column if not exists plan_type text;

alter table public.revenue_events
add column if not exists payment_method text;

alter table public.revenue_events
add column if not exists event_type text;

alter table public.revenue_events drop constraint if exists revenue_events_plan_type_check;

alter table public.revenue_events
add constraint revenue_events_plan_type_check check (
  plan_type is null
  or plan_type in ('premium', 'elite')
);

alter table public.revenue_events drop constraint if exists revenue_events_payment_method_check;

alter table public.revenue_events
add constraint revenue_events_payment_method_check check (
  payment_method is null
  or payment_method in ('khalti_qr', 'esewa_qr', 'global_ime_qr')
);

alter table public.revenue_events drop constraint if exists revenue_events_event_type_check;

alter table public.revenue_events
add constraint revenue_events_event_type_check check (
  event_type is null
  or event_type in ('membership_payment')
);

create index if not exists revenue_events_membership_request_id_idx on public.revenue_events (membership_request_id);

-- At most one ledger row per membership request when linked by id.
create unique index if not exists revenue_events_membership_request_id_unique on public.revenue_events (membership_request_id)
where
  membership_request_id is not null;
