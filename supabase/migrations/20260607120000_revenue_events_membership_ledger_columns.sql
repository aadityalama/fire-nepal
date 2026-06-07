-- Repair / idempotent: membership ledger columns on revenue_events.
-- (Same as 20250607180000_membership_amount_and_revenue_event_details.sql § revenue_events;
--  use this if production skipped that migration and inserts fail with
--  "column revenue_events.membership_request_id does not exist".)

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

create unique index if not exists revenue_events_membership_request_id_unique on public.revenue_events (membership_request_id)
where
  membership_request_id is not null;

notify pgrst, 'reload schema';
