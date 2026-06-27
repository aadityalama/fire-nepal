-- FIRE Nepal AI Phase 2.2: server-side usage tracking, quotas, and admin analytics.

create table if not exists public.fire_ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.fire_ai_conversations (id) on delete set null,
  model text not null,
  membership_plan text not null default 'free' check (membership_plan in ('free', 'premium', 'elite')),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost numeric(12, 8) not null default 0 check (estimated_cost >= 0),
  response_time integer not null default 0 check (response_time >= 0),
  created_at timestamptz not null default now()
);

create index if not exists fire_ai_usage_events_user_created_idx
  on public.fire_ai_usage_events (user_id, created_at desc);

create index if not exists fire_ai_usage_events_conversation_idx
  on public.fire_ai_usage_events (conversation_id);

create index if not exists fire_ai_usage_events_created_idx
  on public.fire_ai_usage_events (created_at desc);

create index if not exists fire_ai_usage_events_plan_created_idx
  on public.fire_ai_usage_events (membership_plan, created_at desc);

create table if not exists public.fire_ai_monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_month text not null check (usage_month ~ '^\d{4}-\d{2}$'),
  ai_messages_used integer not null default 0 check (ai_messages_used >= 0),
  tokens_used integer not null default 0 check (tokens_used >= 0),
  estimated_openai_cost numeric(12, 8) not null default 0 check (estimated_openai_cost >= 0),
  current_membership text not null default 'free' check (current_membership in ('free', 'premium', 'elite')),
  remaining_quota integer not null default 0 check (remaining_quota >= 0),
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_month)
);

create index if not exists fire_ai_monthly_usage_user_month_idx
  on public.fire_ai_monthly_usage (user_id, usage_month desc);

create index if not exists fire_ai_monthly_usage_month_plan_idx
  on public.fire_ai_monthly_usage (usage_month, current_membership);

create or replace function public.fire_ai_usage_month(ts timestamptz)
returns text
language sql
stable
as $$
  select to_char(timezone('UTC', ts), 'YYYY-MM');
$$;

create or replace function public.fire_ai_month_reset_at(month_ym text)
returns timestamptz
language sql
stable
as $$
  select ((to_date(month_ym || '-01', 'YYYY-MM-DD') + interval '1 month')::timestamp at time zone 'UTC');
$$;

alter table public.fire_ai_usage_events enable row level security;
alter table public.fire_ai_monthly_usage enable row level security;

drop policy if exists "Users read own fire ai usage events" on public.fire_ai_usage_events;
drop policy if exists "Users read own fire ai monthly usage" on public.fire_ai_monthly_usage;

-- Usage writes are server-only through the service role. Users can only read their own usage.
create policy "Users read own fire ai usage events"
  on public.fire_ai_usage_events for select
  using (auth.uid() = user_id);

create policy "Users read own fire ai monthly usage"
  on public.fire_ai_monthly_usage for select
  using (auth.uid() = user_id);
