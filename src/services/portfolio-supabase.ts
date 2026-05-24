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
import { coerceWealthPortfolioState, defaultWealthState } from "@/components/portfolio/storage";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

function asPayload<T>(row: unknown): T {
  return row as T;
}

export async function loadWealthPortfolioFromSupabase(client: Client, userId: string): Promise<WealthPortfolioStateV2 | null> {
  const [banks, inv, metals, re, veh, liab, ret, ext] = await Promise.all([
    client.from("bank_accounts").select("row_id,account_kind,payload").eq("user_id", userId),
    client.from("investments").select("row_id,payload").eq("user_id", userId),
    client.from("gold_assets").select("row_id,payload").eq("user_id", userId),
    client.from("real_estate").select("row_id,payload").eq("user_id", userId),
    client.from("vehicles").select("row_id,payload").eq("user_id", userId),
    client.from("liabilities").select("row_id,payload").eq("user_id", userId),
    client.from("retirement_assets").select("row_id,payload").eq("user_id", userId),
    client.from("portfolio_extensions").select("ledger,net_worth_history").eq("user_id", userId).maybeSingle(),
  ]);

  if (banks.error || inv.error || metals.error || re.error || veh.error || liab.error || ret.error || ext.error) {
    console.error("[portfolio-supabase] load error", {
      banks: banks.error,
      inv: inv.error,
      metals: metals.error,
      re: re.error,
      veh: veh.error,
      liab: liab.error,
      ret: ret.error,
      ext: ext.error,
    });
    return null;
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

  const extRow = ext.data as { ledger?: unknown; net_worth_history?: unknown } | null;
  const ledger = Array.isArray(extRow?.ledger) ? (extRow!.ledger as PortfolioLedgerEntry[]) : [];
  const netWorthHistory = Array.isArray(extRow?.net_worth_history)
    ? (extRow!.net_worth_history as NetWorthHistoryPoint[])
    : [];

  if (!hasAny && ledger.length === 0 && netWorthHistory.length === 0) {
    return null;
  }

  return coerceWealthPortfolioState({
    version: 2,
    liquidCash: liquidCash.length ? liquidCash : defaultWealthState().liquidCash,
    fixedDeposits: fixedDeposits.length ? fixedDeposits : defaultWealthState().fixedDeposits,
    investments: investments.length ? investments : defaultWealthState().investments,
    metals: metalRows.length ? metalRows : defaultWealthState().metals,
    realEstate: realEstate.length ? realEstate : defaultWealthState().realEstate,
    vehicles: vehicles.length ? vehicles : defaultWealthState().vehicles,
    liabilities: liabilities.length ? liabilities : defaultWealthState().liabilities,
    globalRetirementAssets: globalRetirementAssets.length ? globalRetirementAssets : defaultWealthState().globalRetirementAssets,
    ledger,
    netWorthHistory,
  });
}

async function deleteMissingRows(
  client: Client,
  table: "bank_accounts" | "investments" | "gold_assets" | "real_estate" | "vehicles" | "liabilities" | "retirement_assets",
  userId: string,
  keepIds: string[],
) {
  const { data, error } = await client.from(table).select("row_id").eq("user_id", userId);
  if (error || !data) return;
  const keep = new Set(keepIds);
  const stale = (data as { row_id: string }[]).map((r) => r.row_id).filter((id) => !keep.has(id));
  if (!stale.length) return;
  await client.from(table).delete().eq("user_id", userId).in("row_id", stale);
}

export async function saveWealthPortfolioToSupabase(client: Client, userId: string, state: WealthPortfolioStateV2): Promise<boolean> {
  const liquidRows = state.liquidCash.map((payload) => ({
    user_id: userId,
    row_id: payload.id,
    account_kind: "liquid" as const,
    payload: payload as unknown as Json,
  }));
  const fdRows = (state.fixedDeposits ?? []).map((payload) => ({
    user_id: userId,
    row_id: payload.id,
    account_kind: "fd" as const,
    payload: payload as unknown as Json,
  }));
  const bankPayload = [...liquidRows, ...fdRows];
  const { error: bankUpsertErr } = await client.from("bank_accounts").upsert(bankPayload, { onConflict: "user_id,row_id" });
  if (bankUpsertErr) {
    console.error("[portfolio-supabase] bank upsert", bankUpsertErr);
    return false;
  }
  await deleteMissingRows(client, "bank_accounts", userId, bankPayload.map((r) => r.row_id));

  const invPayload = state.investments.map((payload) => ({
    user_id: userId,
    row_id: payload.id,
    payload: payload as unknown as Json,
  }));
  const { error: invErr } = await client.from("investments").upsert(invPayload, { onConflict: "user_id,row_id" });
  if (invErr) {
    console.error("[portfolio-supabase] investments", invErr);
    return false;
  }
  await deleteMissingRows(client, "investments", userId, invPayload.map((r) => r.row_id));

  const metalPayload = state.metals.map((payload) => ({
    user_id: userId,
    row_id: payload.id,
    payload: payload as unknown as Json,
  }));
  const { error: metalErr } = await client.from("gold_assets").upsert(metalPayload, { onConflict: "user_id,row_id" });
  if (metalErr) {
    console.error("[portfolio-supabase] gold_assets", metalErr);
    return false;
  }
  await deleteMissingRows(client, "gold_assets", userId, metalPayload.map((r) => r.row_id));

  const mapUpsert = async (
    table: "real_estate" | "vehicles" | "liabilities" | "retirement_assets",
    rows: { id: string }[],
    getPayload: (id: string) => Json,
  ) => {
    const payload = rows.map((r) => ({
      user_id: userId,
      row_id: r.id,
      payload: getPayload(r.id),
    }));
    const { error: e } = await client.from(table).upsert(payload, { onConflict: "user_id,row_id" });
    if (e) {
      console.error(`[portfolio-supabase] ${table}`, e);
      return false;
    }
    await deleteMissingRows(client, table, userId, payload.map((p) => p.row_id));
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
      user_id: userId,
      ledger: state.ledger as unknown as Json,
      net_worth_history: state.netWorthHistory as unknown as Json,
    },
    { onConflict: "user_id" },
  );
  if (extErr) {
    console.error("[portfolio-supabase] portfolio_extensions", extErr);
    return false;
  }

  return true;
}
