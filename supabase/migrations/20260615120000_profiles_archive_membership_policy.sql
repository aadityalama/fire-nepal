-- Membership policy: archive members (hide from active ops), extend CRM event types, SQL bucket.

-- ---------------------------------------------------------------------------
-- profiles.archived_at — hidden from default admin roster; access revoked; reversible
-- ---------------------------------------------------------------------------
alter table public.profiles
add column if not exists archived_at timestamptz;

comment on column public.profiles.archived_at is
'When set, member is archived — excluded from active renewal KPIs; paid access revoked; reversible by clearing.';

create index if not exists profiles_archived_at_idx on public.profiles (archived_at desc nulls last)
where
  archived_at is not null;

-- ---------------------------------------------------------------------------
-- UI bucket helper (5-arg): archived precedes suspension
-- ---------------------------------------------------------------------------
drop function if exists public.profile_membership_ui_bucket (text, timestamptz, timestamptz, timestamptz);

create or replace function public.profile_membership_ui_bucket (
  p_plan_type text,
  p_expires_at timestamptz,
  p_suspended_at timestamptz,
  p_archived_at timestamptz,
  p_now timestamptz default now()
) returns text
language sql
stable
as $$
  select case
    when p_archived_at is not null then 'archived'
    when p_suspended_at is not null then 'suspended'
    when p_plan_type is null
    or p_plan_type = 'free' then 'free'
    when p_expires_at is not null
    and p_expires_at <= p_now then 'expired'
    when p_expires_at is not null
    and p_expires_at <= p_now + interval '7 days' then 'expiring_soon'
    when p_plan_type in ('premium', 'elite') then 'active'
    else 'free'
  end;
$$;

comment on function public.profile_membership_ui_bucket (text, timestamptz, timestamptz, timestamptz, timestamptz) is
'Returns free | active | expiring_soon | expired | suspended | archived for admin filters and badges.';

-- ---------------------------------------------------------------------------
-- admin_member_crm_events — archive / restore / permanent removal audit
-- ---------------------------------------------------------------------------
alter table public.admin_member_crm_events drop constraint if exists admin_member_crm_events_event_type_check;

alter table public.admin_member_crm_events
add constraint admin_member_crm_events_event_type_check check (
  event_type in (
    'membership_renewed',
    'user_suspended',
    'user_reactivated',
    'user_archived',
    'user_restored',
    'user_permanently_removed'
  )
);
