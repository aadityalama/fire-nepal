import { getSupabaseUrl } from "@/lib/supabase/config";
import { ENSURE_CASHFLOW_SNAPSHOTS_SQL } from "@/services/ensure-cashflow-schema";
import { ENSURE_INSURANCE_SCHEMA_SQL } from "@/services/ensure-insurance-schema";

/** Bundled DDL for authenticated finance SoT tables missing or incomplete in production. */
export const ENSURE_FINANCE_SAVINGS_WORKSPACE_SQL = `
create table if not exists public.finance_savings_workspace (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_savings_workspace_updated_idx
  on public.finance_savings_workspace (updated_at desc);

alter table public.finance_savings_workspace enable row level security;

drop policy if exists "Users read own savings workspace" on public.finance_savings_workspace;
drop policy if exists "Users insert own savings workspace" on public.finance_savings_workspace;
drop policy if exists "Users update own savings workspace" on public.finance_savings_workspace;
drop policy if exists "Users delete own savings workspace" on public.finance_savings_workspace;

create policy "Users read own savings workspace"
  on public.finance_savings_workspace for select
  using (auth.uid() = user_id);

create policy "Users insert own savings workspace"
  on public.finance_savings_workspace for insert
  with check (auth.uid() = user_id);

create policy "Users update own savings workspace"
  on public.finance_savings_workspace for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own savings workspace"
  on public.finance_savings_workspace for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.finance_savings_workspace to authenticated;
grant all on table public.finance_savings_workspace to service_role;
revoke all on table public.finance_savings_workspace from anon;
`;

export const ENSURE_USER_MODULE_SNAPSHOTS_SQL = `
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
`;

export const ENSURE_GROUP_MEMBERS_SQL = `
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_member_id text not null,
  display_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_member_id)
);

alter table public.group_members add column if not exists display_name text not null default '';
alter table public.group_members add column if not exists phone text;
alter table public.group_members add column if not exists email text;
alter table public.group_members add column if not exists avatar_url text;
alter table public.group_members add column if not exists sort_order integer not null default 0;
alter table public.group_members add column if not exists deleted_at timestamptz;

alter table public.group_members enable row level security;

drop policy if exists "group_members_self" on public.group_members;
create policy "group_members_self"
  on public.group_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.group_members to authenticated;
grant all on public.group_members to service_role;
`;

export const ENSURE_BUDGET_NOTES_SQL = `
alter table public.finance_budget_records add column if not exists notes text not null default '';
alter table public.finance_budget_records add column if not exists deleted_at timestamptz;
`;

export const ENSURE_POSTGREST_RELOAD_SQL = `notify pgrst, 'reload schema';`;

export const FINANCE_SOT_ENSURE_STEPS: Array<{ id: string; sql: string }> = [
  { id: "cashflow_snapshots", sql: ENSURE_CASHFLOW_SNAPSHOTS_SQL },
  { id: "finance_savings_workspace", sql: ENSURE_FINANCE_SAVINGS_WORKSPACE_SQL },
  { id: "finance_insurance_policies", sql: ENSURE_INSURANCE_SCHEMA_SQL },
  { id: "user_module_snapshots", sql: ENSURE_USER_MODULE_SNAPSHOTS_SQL },
  { id: "group_members", sql: ENSURE_GROUP_MEMBERS_SQL },
  { id: "finance_budget_notes", sql: ENSURE_BUDGET_NOTES_SQL },
  { id: "postgrest_reload", sql: ENSURE_POSTGREST_RELOAD_SQL },
];

function resolveDbUrl(): string {
  const candidates = [
    process.env.SUPABASE_DB_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length >= 20) return trimmed;
  }
  return "";
}

function poolerFallbackUrls(dbUrl: string): string[] {
  try {
    const u = new URL(dbUrl);
    const ref = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
    if (!ref) return [];
    const password = u.password;
    const user = `postgres.${ref}`;
    const regions = ["ap-southeast-1", "ap-south-1", "ap-southeast-2", "us-east-1", "eu-west-1"];
    const urls: string[] = [];
    for (const region of regions) {
      for (const cluster of [1, 0, 2]) {
        urls.push(
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-${cluster}-${region}.pooler.supabase.com:6543/postgres`,
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-${cluster}-${region}.pooler.supabase.com:5432/postgres`,
        );
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export function getFinanceSotMeta() {
  let url = "";
  try {
    url = getSupabaseUrl();
  } catch {
    url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  }
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
  return {
    supabaseUrl: url || null,
    projectRef,
    hasDbUrl: resolveDbUrl().length >= 20,
    hasAccessToken: Boolean((process.env.SUPABASE_ACCESS_TOKEN ?? "").trim()),
  };
}

export type EnsureFinanceSotResult = {
  ok: boolean;
  message: string;
  meta: ReturnType<typeof getFinanceSotMeta>;
  steps: Array<{ id: string; ok: boolean; message: string }>;
};

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

async function runSqlViaManagementApi(
  projectRef: string,
  sql: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  if (!accessToken) return { ok: false, message: "SUPABASE_ACCESS_TOKEN is not configured." };

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
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

/**
 * Apply all finance SoT ensure SQL (idempotent).
 * Requires SUPABASE_DB_URL (preferred) or SUPABASE_ACCESS_TOKEN on the server.
 */
export async function ensureAllFinanceSotSchema(): Promise<EnsureFinanceSotResult> {
  const meta = getFinanceSotMeta();
  const steps: EnsureFinanceSotResult["steps"] = [];

  if (!meta.hasDbUrl && !meta.hasAccessToken) {
    return {
      ok: false,
      message:
        "Neither SUPABASE_DB_URL nor SUPABASE_ACCESS_TOKEN is configured. Add SUPABASE_DB_URL to Vercel Production (and Cursor secrets) to apply finance SoT migrations.",
      meta,
      steps,
    };
  }

  for (const step of FINANCE_SOT_ENSURE_STEPS) {
    let result = meta.hasDbUrl ? await runSqlViaPg(step.sql) : ({ ok: false, message: "no db url" } as const);
    if (!result.ok && meta.projectRef && meta.hasAccessToken) {
      result = await runSqlViaManagementApi(meta.projectRef, step.sql);
    }
    steps.push({
      id: step.id,
      ok: result.ok,
      message: result.ok ? "applied" : result.message,
    });
  }

  const failed = steps.filter((s) => !s.ok);
  return {
    ok: failed.length === 0,
    message:
      failed.length === 0
        ? "All finance SoT schema ensure steps succeeded."
        : `Failed steps: ${failed.map((f) => f.id).join(", ")}`,
    meta,
    steps,
  };
}
