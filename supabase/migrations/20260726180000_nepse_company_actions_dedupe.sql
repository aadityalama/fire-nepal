-- Phase 6: idempotent upserts for typed corporate actions.
-- Adds a natural dedupe key so the disclosure / exchange-notice / dividend streams can be
-- re-ingested on every cron run without creating duplicate timeline rows. Additive only.

alter table public.nepse_company_actions
  add column if not exists dedupe_key text;

-- Backfill existing rows so the unique index can be created without collisions.
update public.nepse_company_actions
set dedupe_key = symbol || '|' || action_type || '|' || coalesce(action_date::text, '') || '|' || left(title, 80)
where dedupe_key is null;

create unique index if not exists nepse_company_actions_dedupe_idx
  on public.nepse_company_actions (dedupe_key);
