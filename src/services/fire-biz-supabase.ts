import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessProfileRow,
  CreditReminderRow,
  CustomerRow,
  FireBizDashboardSummary,
  InventoryItemRow,
  PurchaseRow,
  SaleRow,
  SupplierRow,
  BizTransactionRow,
} from "@/lib/fire-biz/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export async function loadFireBizDashboardSummary(client: Client, userId: string): Promise<FireBizDashboardSummary> {
  const [salesRes, purchasesRes, customersRes, suppliersRes, transactionsRes, inventoryRes] = await Promise.all([
    client.from("sales").select("total_amount").eq("user_id", userId),
    client.from("purchases").select("total_amount").eq("user_id", userId),
    client.from("customers").select("balance").eq("user_id", userId),
    client.from("suppliers").select("balance").eq("user_id", userId),
    client.from("transactions").select("amount, transaction_type, account_type").eq("user_id", userId),
    client.from("inventory_items").select("quantity, cost_price").eq("user_id", userId),
  ]);

  const totalSales = (salesRes.data ?? []).reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalPurchases = (purchasesRes.data ?? []).reduce((sum, r) => sum + Number(r.total_amount), 0);
  const receivables = (customersRes.data ?? []).reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);
  const payables = (suppliersRes.data ?? []).reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);

  let cashBalance = 0;
  for (const tx of transactionsRes.data ?? []) {
    const amt = Number(tx.amount);
    if (tx.transaction_type === "income" || tx.transaction_type === "payment_received") {
      cashBalance += amt;
    } else if (tx.transaction_type === "expense" || tx.transaction_type === "payment_made") {
      cashBalance -= amt;
    }
  }

  const inventoryValue = (inventoryRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.quantity) * Number(r.cost_price),
    0,
  );

  return { totalSales, totalPurchases, receivables, payables, cashBalance, inventoryValue };
}

export async function loadBusinessProfile(client: Client, userId: string): Promise<BusinessProfileRow | null> {
  const { data } = await client.from("business_profiles").select("*").eq("user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function upsertBusinessProfile(
  client: Client,
  userId: string,
  patch: Database["public"]["Tables"]["business_profiles"]["Update"],
): Promise<BusinessProfileRow | null> {
  const existing = await loadBusinessProfile(client, userId);
  if (existing) {
    const { data } = await client
      .from("business_profiles")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    return data;
  }
  const { data } = await client
    .from("business_profiles")
    .insert({ user_id: userId, business_name: patch.business_name ?? "My Business", ...patch })
    .select("*")
    .single();
  return data;
}

export async function loadCustomers(client: Client, userId: string): Promise<CustomerRow[]> {
  const { data } = await client.from("customers").select("*").eq("user_id", userId).order("name");
  return data ?? [];
}

export async function loadSuppliers(client: Client, userId: string): Promise<SupplierRow[]> {
  const { data } = await client.from("suppliers").select("*").eq("user_id", userId).order("name");
  return data ?? [];
}

export async function loadSales(client: Client, userId: string): Promise<SaleRow[]> {
  const { data } = await client.from("sales").select("*").eq("user_id", userId).order("sale_date", { ascending: false });
  return data ?? [];
}

export async function loadPurchases(client: Client, userId: string): Promise<PurchaseRow[]> {
  const { data } = await client
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .order("purchase_date", { ascending: false });
  return data ?? [];
}

export async function loadInventoryItems(client: Client, userId: string): Promise<InventoryItemRow[]> {
  const { data } = await client.from("inventory_items").select("*").eq("user_id", userId).order("name");
  return data ?? [];
}

export async function loadBizTransactions(client: Client, userId: string): Promise<BizTransactionRow[]> {
  const { data } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false });
  return data ?? [];
}

export async function loadCreditReminders(client: Client, userId: string): Promise<CreditReminderRow[]> {
  const { data } = await client
    .from("credit_reminders")
    .select("*")
    .eq("user_id", userId)
    .order("due_date");
  return data ?? [];
}
