import { getSupabaseUrl } from "@/lib/supabase/config";

export const INSURANCE_TABLE = "finance_insurance_policies" as const;
export const INSURANCE_SCHEMA = "public" as const;

export const INSURANCE_LIST_SQL =
  `select id,user_id,insurance_type,provider,coverage_amount_npr,premium_npr,payment_frequency,start_date,expiry_date,policy_term_years,nominee,family_members_covered,notes,agent_name,agent_phone,branch,policy_number,proposal_number,pan,pan_number,medical_notes,documents,premium_history,total_installments,installments_paid,installments_remaining,total_premium_paid,remaining_premium,next_premium_date,next_premium_amount,import_fingerprint,document_data_url,document_file_name,sort_order,deleted_at,created_at,updated_at from public.finance_insurance_policies where user_id = $1 and deleted_at is null order by sort_order asc, created_at asc`;

/** Bundled so Vercel serverless does not depend on reading scripts/ from disk. */
export const ENSURE_INSURANCE_SCHEMA_SQL = `
create table if not exists public.finance_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insurance_type text not null check (
    insurance_type in ('health', 'life', 'critical_illness', 'travel', 'vehicle', 'property', 'other')
  ),
  provider text not null,
  coverage_amount_npr numeric(16, 2) not null default 0 check (coverage_amount_npr >= 0),
  premium_npr numeric(14, 2) not null default 0 check (premium_npr >= 0),
  payment_frequency text not null default 'yearly',
  start_date date,
  expiry_date date,
  policy_term_years integer not null default 0 check (policy_term_years >= 0),
  nominee text,
  family_members_covered jsonb not null default '[]'::jsonb,
  notes text,
  agent_name text,
  agent_phone text,
  branch text,
  policy_number text,
  proposal_number text,
  pan text,
  pan_number text,
  medical_notes text,
  documents jsonb not null default '[]'::jsonb,
  premium_history jsonb not null default '[]'::jsonb,
  total_installments integer not null default 0 check (total_installments >= 0),
  installments_paid integer not null default 0 check (installments_paid >= 0),
  installments_remaining integer not null default 0 check (installments_remaining >= 0),
  total_premium_paid numeric(16, 2) not null default 0,
  remaining_premium numeric(16, 2) not null default 0,
  next_premium_date date,
  next_premium_amount numeric(14, 2) not null default 0,
  import_fingerprint text,
  document_data_url text,
  document_file_name text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_insurance_policies
  drop constraint if exists finance_insurance_policies_payment_frequency_check;

alter table public.finance_insurance_policies
  add constraint finance_insurance_policies_payment_frequency_check
  check (payment_frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'));

alter table public.finance_insurance_policies add column if not exists policy_term_years integer not null default 0;
alter table public.finance_insurance_policies add column if not exists agent_name text;
alter table public.finance_insurance_policies add column if not exists agent_phone text;
alter table public.finance_insurance_policies add column if not exists branch text;
alter table public.finance_insurance_policies add column if not exists policy_number text;
alter table public.finance_insurance_policies add column if not exists proposal_number text;
alter table public.finance_insurance_policies add column if not exists pan text;
alter table public.finance_insurance_policies add column if not exists pan_number text;
alter table public.finance_insurance_policies add column if not exists medical_notes text;
alter table public.finance_insurance_policies add column if not exists documents jsonb not null default '[]'::jsonb;
alter table public.finance_insurance_policies add column if not exists premium_history jsonb not null default '[]'::jsonb;
alter table public.finance_insurance_policies add column if not exists total_installments integer not null default 0;
alter table public.finance_insurance_policies add column if not exists installments_paid integer not null default 0;
alter table public.finance_insurance_policies add column if not exists installments_remaining integer not null default 0;
alter table public.finance_insurance_policies add column if not exists total_premium_paid numeric(16, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists remaining_premium numeric(16, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists next_premium_date date;
alter table public.finance_insurance_policies add column if not exists next_premium_amount numeric(14, 2) not null default 0;
alter table public.finance_insurance_policies add column if not exists import_fingerprint text;
alter table public.finance_insurance_policies add column if not exists deleted_at timestamptz;

create index if not exists finance_insurance_policies_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc);

create index if not exists finance_insurance_policies_active_user_sort_idx
  on public.finance_insurance_policies (user_id, sort_order asc, created_at asc)
  where deleted_at is null;

create unique index if not exists finance_insurance_policies_user_import_fingerprint_uidx
  on public.finance_insurance_policies (user_id, import_fingerprint)
  where import_fingerprint is not null and deleted_at is null;

alter table public.finance_insurance_policies enable row level security;

drop policy if exists "Users read own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users insert own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users update own finance insurance policies" on public.finance_insurance_policies;
drop policy if exists "Users delete own finance insurance policies" on public.finance_insurance_policies;

create policy "Users read own finance insurance policies"
  on public.finance_insurance_policies for select
  using (auth.uid() = user_id);

create policy "Users insert own finance insurance policies"
  on public.finance_insurance_policies for insert
  with check (auth.uid() = user_id);

create policy "Users update own finance insurance policies"
  on public.finance_insurance_policies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own finance insurance policies"
  on public.finance_insurance_policies for delete
  using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.finance_insurance_policies to authenticated;
grant all on table public.finance_insurance_policies to service_role;
revoke all on table public.finance_insurance_policies from anon;

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

export function getInsuranceSupabaseMeta() {
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
    schema: INSURANCE_SCHEMA,
    table: INSURANCE_TABLE,
    listSql: INSURANCE_LIST_SQL,
    hasDbUrl: resolveDbUrl().length >= 20,
  };
}

export type EnsureInsuranceSchemaResult = {
  ok: boolean;
  createdOrVerified: boolean;
  message: string;
  meta: ReturnType<typeof getInsuranceSupabaseMeta>;
  attempts?: number;
};

/**
 * Ensure the single production insurance table exists.
 * Uses SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL) — same path as other finance migrations.
 */
export async function ensureFinanceInsurancePoliciesSchema(): Promise<EnsureInsuranceSchemaResult> {
  const meta = getInsuranceSupabaseMeta();
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
        await client.query(ENSURE_INSURANCE_SCHEMA_SQL);
        await client.end();
        return {
          ok: true,
          createdOrVerified: true,
          message: "public.finance_insurance_policies is ready (pg).",
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

    // Fall through to Management API if available.
    if (!accessToken || !meta.projectRef) {
      return {
        ok: false,
        createdOrVerified: false,
        message: `Could not ensure insurance schema via pg: ${lastError}`,
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
        body: JSON.stringify({ query: ENSURE_INSURANCE_SCHEMA_SQL }),
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
        message: "public.finance_insurance_policies is ready (management api).",
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
      "Neither SUPABASE_DB_URL nor SUPABASE_ACCESS_TOKEN is configured on the server. Cannot create public.finance_insurance_policies.",
    meta,
  };
}

export function isMissingInsuranceTableError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = message.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (lower.includes("finance_insurance_policies") &&
      (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find the table")))
  );
}
