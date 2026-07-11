import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FixedDepositRow,
  GlobalRetirementAssetRow,
  InvestmentRow,
  LiabilityRow,
  MetalRow,
  NetWorthHistoryPoint,
  PortfolioLedgerEntry,
  RealEstateRow,
  SimpleMoneyLine,
  VehicleRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { coerceWealthPortfolioState } from "@/components/portfolio/storage";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

function asPayload<T>(row: unknown): T {
  return row as T;
}

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export class PortfolioSupabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PortfolioSupabaseError";
  }
}

function formatSupabaseError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const e = error as SupabaseLikeError;
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) {
      return e.code ? `${parts.join(" ")} (${e.code})` : parts.join(" ");
    }
  }
  return fallback;
}

function portfolioSaveError(operation: string, error: unknown, fallback: string): never {
  const message = formatSupabaseError(error, fallback);
  console.error(`[portfolio-supabase] ${operation}`, error);
  throw new PortfolioSupabaseError(message, operation, error);
}

export async function loadWealthPortfolioFromSupabase(client: Client, userId: string): Promise<WealthPortfolioStateV2 | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "loadWealthPortfolioFromSupabase");
  if (!workspace) return null;
  const ownerId = workspace.user_id;

  const [banks, inv, metals, re, veh, liab, ret, ext] = await Promise.all([
    client.from("bank_accounts").select("row_id,account_kind,payload").eq("user_id", ownerId),
    client.from("investments").select("row_id,payload").eq("user_id", ownerId),
    client.from("gold_assets").select("row_id,payload").eq("user_id", ownerId),
    client.from("real_estate").select("row_id,payload").eq("user_id", ownerId),
    client.from("vehicles").select("row_id,payload").eq("user_id", ownerId),
    client.from("liabilities").select("row_id,payload").eq("user_id", ownerId),
    client.from("retirement_assets").select("row_id,payload").eq("user_id", ownerId),
    client.from("portfolio_extensions").select("ledger,net_worth_history,metal_purchase_bill_urls").eq("user_id", ownerId).maybeSingle(),
  ]);

  if (banks.error || inv.error || metals.error || re.error || veh.error || liab.error || ret.error || ext.error) {
    const errorBundle = {
      banks: banks.error,
      inv: inv.error,
      metals: metals.error,
      re: re.error,
      veh: veh.error,
      liab: liab.error,
      ret: ret.error,
      ext: ext.error,
    };
    if (process.env.NODE_ENV !== "production") {
      console.error("[portfolio-supabase] load error", errorBundle);
    }
    const firstError = banks.error ?? inv.error ?? metals.error ?? re.error ?? veh.error ?? liab.error ?? ret.error ?? ext.error;
    throw new PortfolioSupabaseError(
      formatSupabaseError(firstError, "Could not load portfolio transaction history."),
      "loadWealthPortfolioFromSupabase",
      firstError,
    );
  }

  const liquidCash: SimpleMoneyLine[] = [];
  const fixedDeposits: FixedDepositRow[] = [];
  type BankRow = { row_id: string; account_kind: "liquid" | "fd"; payload: Json };
  for (const row of (banks.data ?? []) as BankRow[]) {
    if (row.account_kind === "liquid") {
      liquidCash.push(asPayload<SimpleMoneyLine>(row.payload));
    } else {
      fixedDeposits.push(asPayload<FixedDepositRow>(row.payload));
    }
  }

  const investments = ((inv.data ?? []) as { row_id: string; payload: Json }[]).map((r) => asPayload<InvestmentRow>(r.payload));
  const metalRows = ((metals.data ?? []) as { row_id: string; payload: Json }[]).map((r) => asPayload<MetalRow>(r.payload));
  const realEstate = ((re.data ?? []) as { row_id: string; payload: Json }[]).map((r) => asPayload<RealEstateRow>(r.payload));
  const vehicles = ((veh.data ?? []) as { row_id: string; payload: Json }[]).map((r) => asPayload<VehicleRow>(r.payload));
  const liabilities = ((liab.data ?? []) as { row_id: string; payload: Json }[]).map((r) => asPayload<LiabilityRow>(r.payload));
  const globalRetirementAssets = ((ret.data ?? []) as { row_id: string; payload: Json }[]).map((r) =>
    asPayload<GlobalRetirementAssetRow>(r.payload),
  );

  const hasAny =
    liquidCash.length +
      fixedDeposits.length +
      investments.length +
      metalRows.length +
      realEstate.length +
      vehicles.length +
      liabilities.length +
      globalRetirementAssets.length >
    0;

  const extRow = ext.data as {
    ledger?: unknown;
    net_worth_history?: unknown;
    metal_purchase_bill_urls?: unknown;
  } | null;
  const ledger = Array.isArray(extRow?.ledger) ? (extRow!.ledger as PortfolioLedgerEntry[]) : [];
  const netWorthHistory = Array.isArray(extRow?.net_worth_history)
    ? (extRow!.net_worth_history as NetWorthHistoryPoint[])
    : [];
  const metalPurchaseBillUrls = Array.isArray(extRow?.metal_purchase_bill_urls)
    ? (extRow!.metal_purchase_bill_urls as string[])
    : undefined;

  if (!hasAny && ledger.length === 0 && netWorthHistory.length === 0 && !(metalPurchaseBillUrls && metalPurchaseBillUrls.length > 0)) {
    return null;
  }

  return coerceWealthPortfolioState({
    version: 2,
    liquidCash,
    fixedDeposits,
    investments,
    metals: metalRows,
    realEstate,
    vehicles,
    liabilities,
    globalRetirementAssets,
    ledger,
    netWorthHistory,
    metalPurchaseBillUrls,
  });
}

async function deleteMissingRows(
  client: Client,
  table: "bank_accounts" | "investments" | "gold_assets" | "real_estate" | "vehicles" | "liabilities" | "retirement_assets",
  ownerId: string,
  keepIds: string[],
) {
  const { data, error } = await client.from(table).select("row_id").eq("user_id", ownerId);
  if (error || !data) {
    portfolioSaveError(`${table} stale row lookup`, error, `Could not verify saved ${table}.`);
  }
  const keep = new Set(keepIds);
  const stale = (data as { row_id: string }[]).map((r) => r.row_id).filter((id) => !keep.has(id));
  if (!stale.length) return;
  const { error: deleteError } = await client.from(table).delete().eq("user_id", ownerId).in("row_id", stale);
  if (deleteError) {
    portfolioSaveError(`${table} stale row delete`, deleteError, `Could not remove stale ${table}.`);
  }
}

export async function saveWealthPortfolioToSupabase(client: Client, userId: string, state: WealthPortfolioStateV2): Promise<boolean> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "saveWealthPortfolioToSupabase");
  if (!workspace) {
    throw new PortfolioSupabaseError("Authenticated workspace owner mismatch. Please sign in again.", "workspace");
  }
  const ownerId = workspace.user_id;

  const liquidRows = state.liquidCash.map((payload) => ({
    user_id: ownerId,
    row_id: payload.id,
    account_kind: "liquid" as const,
    payload: payload as unknown as Json,
  }));
  const fdRows = (state.fixedDeposits ?? []).map((payload) => ({
    user_id: ownerId,
    row_id: payload.id,
    account_kind: "fd" as const,
    payload: payload as unknown as Json,
  }));
  const bankPayload = [...liquidRows, ...fdRows];
  const { error: bankUpsertErr } = await client.from("bank_accounts").upsert(bankPayload, { onConflict: "user_id,row_id" });
  if (bankUpsertErr) {
    portfolioSaveError("bank_accounts upsert", bankUpsertErr, "Could not save portfolio accounts.");
  }
  await deleteMissingRows(client, "bank_accounts", ownerId, bankPayload.map((r) => r.row_id));

  const invPayload = state.investments.map((payload) => ({
    user_id: ownerId,
    row_id: payload.id,
    payload: payload as unknown as Json,
  }));
  const { error: invErr } = await client.from("investments").upsert(invPayload, { onConflict: "user_id,row_id" });
  if (invErr) {
    portfolioSaveError("investments upsert", invErr, "Could not save investment accounts.");
  }
  await deleteMissingRows(client, "investments", ownerId, invPayload.map((r) => r.row_id));

  const metalPayload = state.metals.map((payload) => ({
    user_id: ownerId,
    row_id: payload.id,
    payload: payload as unknown as Json,
  }));
  const { error: metalErr } = await client.from("gold_assets").upsert(metalPayload, { onConflict: "user_id,row_id" });
  if (metalErr) {
    portfolioSaveError("gold_assets upsert", metalErr, "Could not save metal accounts.");
  }
  await deleteMissingRows(client, "gold_assets", ownerId, metalPayload.map((r) => r.row_id));

  const mapUpsert = async (
    table: "real_estate" | "vehicles" | "liabilities" | "retirement_assets",
    rows: { id: string }[],
    getPayload: (id: string) => Json,
  ) => {
    const payload = rows.map((r) => ({
      user_id: ownerId,
      row_id: r.id,
      payload: getPayload(r.id),
    }));
    const { error: e } = await client.from(table).upsert(payload, { onConflict: "user_id,row_id" });
    if (e) {
      portfolioSaveError(`${table} upsert`, e, `Could not save ${table}.`);
    }
    await deleteMissingRows(client, table, ownerId, payload.map((p) => p.row_id));
    return true;
  };

  if (!(await mapUpsert("real_estate", state.realEstate, (id) => state.realEstate.find((x) => x.id === id)! as unknown as Json))) {
    return false;
  }
  if (!(await mapUpsert("vehicles", state.vehicles, (id) => state.vehicles.find((x) => x.id === id)! as unknown as Json))) {
    return false;
  }
  if (
    !(await mapUpsert("liabilities", state.liabilities, (id) => state.liabilities.find((x) => x.id === id)! as unknown as Json))
  ) {
    return false;
  }
  if (
    !(await mapUpsert(
      "retirement_assets",
      state.globalRetirementAssets,
      (id) => state.globalRetirementAssets.find((x) => x.id === id)! as unknown as Json,
    ))
  ) {
    return false;
  }

  const { error: extErr } = await client.from("portfolio_extensions").upsert(
    {
      user_id: ownerId,
      ledger: state.ledger as unknown as Json,
      net_worth_history: state.netWorthHistory as unknown as Json,
      metal_purchase_bill_urls: (state.metalPurchaseBillUrls ?? []) as unknown as Json,
    },
    { onConflict: "user_id" },
  );
  if (extErr) {
    portfolioSaveError("portfolio_extensions upsert", extErr, "Could not save portfolio transactions.");
  }

  return true;
}
