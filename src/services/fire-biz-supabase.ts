import type { SupabaseClient } from "@supabase/supabase-js";
import { sumMonthlyExpenses, sumMonthlyPurchases, sumMonthlySales } from "@/lib/fire-biz/analytics";
import type {
  BusinessProfileRow,
  CreditReminderRow,
  CustomerRow,
  ExpenseCategoryRow,
  FireBizDashboardSummary,
  InventoryItemRow,
  PurchaseOrderRow,
  PurchaseRow,
  SaleRow,
  SupplierRow,
  BizTransactionRow,
  PaymentMethod,
  PurchaseOrderStatus,
} from "@/lib/fire-biz/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export async function loadFireBizDashboardSummary(client: Client, userId: string): Promise<FireBizDashboardSummary> {
  const [salesRes, purchasesRes, customersRes, suppliersRes, transactionsRes, inventoryRes] = await Promise.all([
    client.from("sales").select("total_amount, sale_date").eq("user_id", userId),
    client.from("purchases").select("total_amount, purchase_date").eq("user_id", userId),
    client.from("customers").select("balance").eq("user_id", userId),
    client.from("suppliers").select("balance").eq("user_id", userId),
    client.from("transactions").select("amount, transaction_type, account_type, transaction_date").eq("user_id", userId),
    client.from("inventory_items").select("quantity, cost_price").eq("user_id", userId),
  ]);

  const sales = salesRes.data ?? [];
  const purchases = purchasesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];

  const totalSales = sales.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const totalPurchases = purchases.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const receivables = (customersRes.data ?? []).reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);
  const payables = (suppliersRes.data ?? []).reduce((sum, r) => sum + Math.max(0, Number(r.balance)), 0);

  let cashBalance = 0;
  for (const tx of transactions) {
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

  const monthlySales = sumMonthlySales(sales as SaleRow[]);
  const monthlyPurchases = sumMonthlyPurchases(purchases as PurchaseRow[]);
  const monthlyExpenses = sumMonthlyExpenses(transactions as BizTransactionRow[]);

  return {
    receivables,
    payables,
    monthlySales,
    monthlyPurchases,
    monthlyExpenses,
    cashBalance,
    totalSales,
    totalPurchases,
    inventoryValue,
  };
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

export async function loadSaleById(client: Client, userId: string, saleId: string): Promise<SaleRow | null> {
  const { data } = await client.from("sales").select("*").eq("user_id", userId).eq("id", saleId).maybeSingle();
  return data;
}

export async function loadExpenseCategories(client: Client, userId: string): Promise<ExpenseCategoryRow[]> {
  const { data } = await client.from("expense_categories").select("*").eq("user_id", userId).order("name");
  return data ?? [];
}

export async function loadPurchaseOrders(client: Client, userId: string): Promise<PurchaseOrderRow[]> {
  const { data } = await client
    .from("purchase_orders")
    .select("*")
    .eq("user_id", userId)
    .order("order_date", { ascending: false });
  return data ?? [];
}

export async function upsertExpenseCategory(
  client: Client,
  userId: string,
  input: { id?: string; name: string; color?: string | null },
): Promise<ExpenseCategoryRow | null> {
  if (input.id) {
    const { data } = await client
      .from("expense_categories")
      .update({ name: input.name, color: input.color ?? null })
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    return data;
  }
  const { data } = await client
    .from("expense_categories")
    .insert({ user_id: userId, name: input.name, color: input.color ?? null })
    .select("*")
    .single();
  return data;
}

export async function deleteExpenseCategory(client: Client, userId: string, id: string): Promise<void> {
  await client.from("expense_categories").delete().eq("id", id).eq("user_id", userId);
}

export async function upsertExpense(
  client: Client,
  userId: string,
  input: {
    id?: string;
    amount: number;
    transaction_date: string;
    expense_category_id?: string | null;
    party_name?: string | null;
    account_type?: "cash" | "bank";
    notes?: string | null;
  },
): Promise<BizTransactionRow | null> {
  const row = {
    transaction_type: "expense" as const,
    amount: input.amount,
    transaction_date: input.transaction_date,
    expense_category_id: input.expense_category_id ?? null,
    party_name: input.party_name ?? null,
    account_type: input.account_type ?? "cash",
    reference_type: "expense" as const,
    notes: input.notes ?? null,
  };
  if (input.id) {
    const { data } = await client
      .from("transactions")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    return data;
  }
  const { data } = await client.from("transactions").insert({ user_id: userId, ...row }).select("*").single();
  return data;
}

export async function deleteExpense(client: Client, userId: string, id: string): Promise<void> {
  await client.from("transactions").delete().eq("id", id).eq("user_id", userId).eq("transaction_type", "expense");
}

export type PurchaseOrderInput = Omit<Database["public"]["Tables"]["purchase_orders"]["Insert"], "user_id"> & { id?: string };

export async function upsertPurchaseOrder(
  client: Client,
  userId: string,
  input: PurchaseOrderInput,
): Promise<PurchaseOrderRow | null> {
  if (input.id) {
    const patch: Database["public"]["Tables"]["purchase_orders"]["Update"] = {
      business_profile_id: input.business_profile_id,
      supplier_id: input.supplier_id,
      po_number: input.po_number,
      order_date: input.order_date,
      expected_date: input.expected_date,
      status: input.status,
      subtotal: input.subtotal,
      tax_amount: input.tax_amount,
      total_amount: input.total_amount,
      line_items: input.line_items,
      notes: input.notes,
    };
    const { data } = await client
      .from("purchase_orders")
      .update(patch)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    return data;
  }
  const { id: _id, ...rest } = input;
  const { data } = await client
    .from("purchase_orders")
    .insert({ user_id: userId, ...rest, line_items: rest.line_items ?? [] })
    .select("*")
    .single();
  return data;
}

export async function updatePurchaseOrderStatus(
  client: Client,
  userId: string,
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrderRow | null> {
  const { data } = await client
    .from("purchase_orders")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  return data;
}

export async function deletePurchaseOrder(client: Client, userId: string, id: string): Promise<void> {
  await client.from("purchase_orders").delete().eq("id", id).eq("user_id", userId);
}

export async function updateSalePayment(
  client: Client,
  userId: string,
  saleId: string,
  patch: { amount_paid?: number; payment_status?: SaleRow["payment_status"]; payment_method?: PaymentMethod },
): Promise<SaleRow | null> {
  const { data } = await client
    .from("sales")
    .update(patch)
    .eq("id", saleId)
    .eq("user_id", userId)
    .select("*")
    .single();
  return data;
}

export async function ensureDefaultExpenseCategories(client: Client, userId: string): Promise<void> {
  const existing = await loadExpenseCategories(client, userId);
  if (existing.length > 0) return;
  const defaults = ["Rent", "Utilities", "Salaries", "Transport", "Marketing", "Miscellaneous"];
  await client.from("expense_categories").insert(defaults.map((name) => ({ user_id: userId, name })));
}
