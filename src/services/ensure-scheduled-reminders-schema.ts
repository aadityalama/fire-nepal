import { getSupabaseUrl } from "@/lib/supabase/config";

export const ENSURE_SCHEDULED_REMINDERS_EMAIL_LIFECYCLE_SQL = `
alter table public.scheduled_reminders
  add column if not exists email_enabled boolean not null default true;

alter table public.scheduled_reminders
  add column if not exists is_archived boolean not null default false;

alter table public.scheduled_reminders
  add column if not exists last_email_sent_at timestamptz;

create index if not exists scheduled_reminders_cron_active_idx
  on public.scheduled_reminders (due_date)
  where (not is_completed) and (not is_archived) and email_enabled;

create table if not exists public.user_reminder_email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_reminder_email_preferences enable row level security;

drop policy if exists "Users read own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users read own reminder email prefs"
  on public.user_reminder_email_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users upsert own reminder email prefs"
  on public.user_reminder_email_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users update own reminder email prefs"
  on public.user_reminder_email_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_reminder_email_preferences to authenticated;
grant all on table public.user_reminder_email_preferences to service_role;

notify pgrst, 'reload schema';
`;

function resolveDbUrl(): string | null {
  return (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "").trim() || null;
}

function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function poolerFallbackUrls(dbUrl: string): string[] {
  const out: string[] = [];
  try {
    const u = new URL(dbUrl);
    if (u.hostname.includes("pooler.supabase.com")) return out;
    const ref = projectRefFromUrl(getSupabaseUrl() || "") || u.username.replace(/^postgres\./, "");
    if (!ref) return out;
    const pwd = decodeURIComponent(u.password);
    out.push(`postgresql://postgres.${ref}:${encodeURIComponent(pwd)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`);
  } catch {
    /* ignore */
  }
  return out;
}

async function runSqlViaPg(sql: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) return { ok: false, message: "SUPABASE_DB_URL is not configured." };

  let pg: any;
  try {
    // @ts-expect-error — pg ships without types in this repo
    pg = await import("pg");
  } catch {
    return { ok: false, message: "pg driver is unavailable in this runtime." };
  }

  const Client = pg.Client ?? pg.default?.Client;
  if (!Client) return { ok: false, message: "pg.Client is unavailable." };

  const attempts = [dbUrl, ...poolerFallbackUrls(dbUrl)];
  let lastError = "unknown error";
  for (const url of attempts) {
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { ok: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return { ok: false, message: lastError };
}

async function runSqlViaManagementApi(sql: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  const ref = projectRefFromUrl(getSupabaseUrl() || "");
  if (!accessToken) return { ok: false, message: "SUPABASE_ACCESS_TOKEN is not configured." };
  if (!ref) return { ok: false, message: "Could not derive Supabase project ref." };

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, message: `Management API ${res.status}: ${text.slice(0, 400)}` };
  }
  return { ok: true };
}

export async function ensureScheduledRemindersEmailLifecycleSchema(): Promise<{
  ok: boolean;
  message: string;
  via: "pg" | "management_api" | "none";
}> {
  const hasDbUrl = Boolean(resolveDbUrl());
  const hasAccessToken = Boolean((process.env.SUPABASE_ACCESS_TOKEN ?? "").trim());
  if (!hasDbUrl && !hasAccessToken) {
    return {
      ok: false,
      via: "none",
      message:
        "Neither SUPABASE_DB_URL nor SUPABASE_ACCESS_TOKEN is configured on the server. Apply supabase/migrations/20260807120000_scheduled_reminders_email_lifecycle.sql manually.",
    };
  }

  if (hasDbUrl) {
    const pg = await runSqlViaPg(ENSURE_SCHEDULED_REMINDERS_EMAIL_LIFECYCLE_SQL);
    if (pg.ok) return { ok: true, via: "pg", message: "applied via SUPABASE_DB_URL" };
    if (hasAccessToken) {
      const api = await runSqlViaManagementApi(ENSURE_SCHEDULED_REMINDERS_EMAIL_LIFECYCLE_SQL);
      if (api.ok) return { ok: true, via: "management_api", message: `pg failed (${pg.message}); applied via management API` };
      return { ok: false, via: "none", message: `pg: ${pg.message}; management: ${api.message}` };
    }
    return { ok: false, via: "none", message: pg.message };
  }

  const api = await runSqlViaManagementApi(ENSURE_SCHEDULED_REMINDERS_EMAIL_LIFECYCLE_SQL);
  return api.ok
    ? { ok: true, via: "management_api", message: "applied via SUPABASE_ACCESS_TOKEN" }
    : { ok: false, via: "none", message: api.message };
}
