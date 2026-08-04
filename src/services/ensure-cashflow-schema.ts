import { getSupabaseUrl } from "@/lib/supabase/config";

export const CASHFLOW_TABLE = "cashflow_snapshots" as const;
export const CASHFLOW_SCHEMA = "public" as const;

/** Bundled so Vercel serverless does not depend on reading scripts/ from disk. */
export const ENSURE_CASHFLOW_SNAPSHOTS_SQL = `
create table if not exists public.cashflow_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashflow_snapshots_updated_idx
  on public.cashflow_snapshots (updated_at desc);

alter table public.cashflow_snapshots enable row level security;

drop policy if exists "Users read own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users insert own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users update own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users delete own cashflow snapshots" on public.cashflow_snapshots;

create policy "Users read own cashflow snapshots"
  on public.cashflow_snapshots for select
  using (auth.uid() = user_id);

create policy "Users insert own cashflow snapshots"
  on public.cashflow_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users update own cashflow snapshots"
  on public.cashflow_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own cashflow snapshots"
  on public.cashflow_snapshots for delete
  using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.cashflow_snapshots to authenticated;
grant all on table public.cashflow_snapshots to service_role;
revoke all on table public.cashflow_snapshots from anon;

notify pgrst, 'reload schema';
`;

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

export function getCashflowSupabaseMeta() {
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
    schema: CASHFLOW_SCHEMA,
    table: CASHFLOW_TABLE,
    hasDbUrl: resolveDbUrl().length >= 20,
  };
}

export type EnsureCashflowSchemaResult = {
  ok: boolean;
  createdOrVerified: boolean;
  message: string;
  meta: ReturnType<typeof getCashflowSupabaseMeta>;
  attempts?: number;
};

/**
 * Ensure the production cashflow_snapshots table exists.
 * Uses SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL) — same path as other finance migrations.
 */
export async function ensureCashflowSnapshotsSchema(): Promise<EnsureCashflowSchemaResult> {
  const meta = getCashflowSupabaseMeta();
  const dbUrl = resolveDbUrl();
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();

  if (dbUrl) {
    let pg: any;
    try {
      // @ts-expect-error — pg ships without types in this repo; scripts already use it untyped.
      pg = await import("pg");
    } catch {
      return {
        ok: false,
        createdOrVerified: false,
        message: "pg driver is unavailable in this runtime.",
        meta,
      };
    }

    const attempts = [dbUrl, ...poolerFallbackUrls(dbUrl)];
    let lastError = "unknown error";
    let attemptCount = 0;
    const Client = pg.Client ?? pg.default?.Client;

    if (!Client) {
      return {
        ok: false,
        createdOrVerified: false,
        message: "pg.Client is unavailable in this runtime.",
        meta,
      };
    }

    for (const url of attempts) {
      attemptCount += 1;
      const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        await client.query(ENSURE_CASHFLOW_SNAPSHOTS_SQL);
        await client.end();
        return {
          ok: true,
          createdOrVerified: true,
          message: "public.cashflow_snapshots is ready (pg).",
          meta,
          attempts: attemptCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      }
    }

    if (!accessToken || !meta.projectRef) {
      return {
        ok: false,
        createdOrVerified: false,
        message: `Could not ensure cashflow schema via pg: ${lastError}`,
        meta,
        attempts: attemptCount,
      };
    }
  }

  if (accessToken && meta.projectRef) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${meta.projectRef}/database/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: ENSURE_CASHFLOW_SNAPSHOTS_SQL }),
      });
      const body = await res.text();
      if (!res.ok) {
        return {
          ok: false,
          createdOrVerified: false,
          message: `Management API failed (${res.status}): ${body.slice(0, 300)}`,
          meta,
        };
      }
      return {
        ok: true,
        createdOrVerified: true,
        message: "public.cashflow_snapshots is ready (management api).",
        meta,
      };
    } catch (error) {
      return {
        ok: false,
        createdOrVerified: false,
        message: `Management API error: ${error instanceof Error ? error.message : String(error)}`,
        meta,
      };
    }
  }

  return {
    ok: false,
    createdOrVerified: false,
    message:
      "Neither SUPABASE_DB_URL nor SUPABASE_ACCESS_TOKEN is configured on the server. Cannot create public.cashflow_snapshots.",
    meta,
  };
}

export { isMissingCashflowTableError } from "@/services/cashflow-supabase";
