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

export type CustomerInput = Omit<Database["public"]["Tables"]["customers"]["Insert"], "user_id"> & { id?: string };

export async function loadCustomerById(client: Client, userId: string, id: string): Promise<CustomerRow | null> {
  const { data } = await client.from("customers").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  return data;
}

export async function upsertCustomer(client: Client, userId: string, input: CustomerInput): Promise<CustomerRow | null> {
  const opening = Number(input.opening_balance ?? 0);
  if (input.id) {
    const patch: Database["public"]["Tables"]["customers"]["Update"] = {
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      opening_balance: opening,
      balance: input.balance ?? opening,
      notes: input.notes ?? null,
      business_profile_id: input.business_profile_id,
    };
    const { data } = await client.from("customers").update(patch).eq("id", input.id).eq("user_id", userId).select("*").single();
    return data;
  }
  const { id: _id, ...rest } = input;
  const { data } = await client
    .from("customers")
    .insert({
      user_id: userId,
      name: rest.name,
      phone: rest.phone ?? null,
      email: rest.email ?? null,
      address: rest.address ?? null,
      opening_balance: opening,
      balance: rest.balance ?? opening,
      notes: rest.notes ?? null,
      business_profile_id: rest.business_profile_id ?? null,
    })
    .select("*")
    .single();
  return data;
}

export async function deleteCustomer(client: Client, userId: string, id: string): Promise<void> {
  await client.from("customers").delete().eq("id", id).eq("user_id", userId);
}

export type SaleInput = Omit<Database["public"]["Tables"]["sales"]["Insert"], "user_id"> & { id?: string };

export async function loadPurchaseById(client: Client, userId: string, id: string): Promise<PurchaseRow | null> {
  const { data } = await client.from("purchases").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  return data;
}

export async function upsertSale(client: Client, userId: string, input: SaleInput): Promise<SaleRow | null> {
  if (input.id) {
    const patch: Database["public"]["Tables"]["sales"]["Update"] = {
      business_profile_id: input.business_profile_id,
      customer_id: input.customer_id,
      invoice_number: input.invoice_number,
      sale_date: input.sale_date,
      subtotal: input.subtotal,
      tax_amount: input.tax_amount,
      discount_amount: input.discount_amount,
      total_amount: input.total_amount,
      amount_paid: input.amount_paid,
      payment_status: input.payment_status,
      payment_method: input.payment_method,
      vat_rate: input.vat_rate,
      is_tax_invoice: input.is_tax_invoice,
      line_items: input.line_items,
      notes: input.notes,
    };
    const { data } = await client.from("sales").update(patch).eq("id", input.id).eq("user_id", userId).select("*").single();
    return data;
  }
  const { id: _id, ...rest } = input;
  const { data } = await client
    .from("sales")
    .insert({
      user_id: userId,
      sale_date: rest.sale_date ?? new Date().toISOString().slice(0, 10),
      subtotal: rest.subtotal ?? 0,
      tax_amount: rest.tax_amount ?? 0,
      discount_amount: rest.discount_amount ?? 0,
      total_amount: rest.total_amount ?? 0,
      amount_paid: rest.amount_paid ?? 0,
      payment_status: rest.payment_status ?? "unpaid",
      payment_method: rest.payment_method ?? "cash",
      vat_rate: rest.vat_rate ?? 13,
      is_tax_invoice: rest.is_tax_invoice ?? false,
      line_items: rest.line_items ?? [],
      ...rest,
    })
    .select("*")
    .single();
  return data;
}

export async function deleteSale(client: Client, userId: string, id: string): Promise<void> {
  await client.from("sales").delete().eq("id", id).eq("user_id", userId);
}

export type PurchaseInput = Omit<Database["public"]["Tables"]["purchases"]["Insert"], "user_id"> & { id?: string };

export async function upsertPurchase(client: Client, userId: string, input: PurchaseInput): Promise<PurchaseRow | null> {
  if (input.id) {
    const patch: Database["public"]["Tables"]["purchases"]["Update"] = {
      business_profile_id: input.business_profile_id,
      supplier_id: input.supplier_id,
      bill_number: input.bill_number,
      purchase_date: input.purchase_date,
      subtotal: input.subtotal,
      tax_amount: input.tax_amount,
      discount_amount: input.discount_amount,
      total_amount: input.total_amount,
      amount_paid: input.amount_paid,
      payment_status: input.payment_status,
      line_items: input.line_items,
      notes: input.notes,
    };
    const { data } = await client.from("purchases").update(patch).eq("id", input.id).eq("user_id", userId).select("*").single();
    return data;
  }
  const { id: _id, ...rest } = input;
  const { data } = await client
    .from("purchases")
    .insert({
      user_id: userId,
      purchase_date: rest.purchase_date ?? new Date().toISOString().slice(0, 10),
      subtotal: rest.subtotal ?? 0,
      tax_amount: rest.tax_amount ?? 0,
      discount_amount: rest.discount_amount ?? 0,
      total_amount: rest.total_amount ?? 0,
      amount_paid: rest.amount_paid ?? 0,
      payment_status: rest.payment_status ?? "unpaid",
      line_items: rest.line_items ?? [],
      ...rest,
    })
    .select("*")
    .single();
  return data;
}

export async function deletePurchase(client: Client, userId: string, id: string): Promise<void> {
  await client.from("purchases").delete().eq("id", id).eq("user_id", userId);
}

export type InventoryItemInput = Omit<Database["public"]["Tables"]["inventory_items"]["Insert"], "user_id"> & { id?: string };

export async function loadInventoryItemById(client: Client, userId: string, id: string): Promise<InventoryItemRow | null> {
  const { data } = await client.from("inventory_items").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  return data;
}

export async function upsertInventoryItem(
  client: Client,
  userId: string,
  input: InventoryItemInput,
): Promise<InventoryItemRow | null> {
  if (input.id) {
    const patch: Database["public"]["Tables"]["inventory_items"]["Update"] = {
      sku: input.sku,
      name: input.name,
      category: input.category,
      unit: input.unit,
      quantity: input.quantity,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      reorder_level: input.reorder_level,
      notes: input.notes,
      business_profile_id: input.business_profile_id,
    };
    const { data } = await client.from("inventory_items").update(patch).eq("id", input.id).eq("user_id", userId).select("*").single();
    return data;
  }
  const { id: _id, ...rest } = input;
  const { data } = await client
    .from("inventory_items")
    .insert({
      user_id: userId,
      name: rest.name,
      sku: rest.sku ?? null,
      category: rest.category ?? null,
      unit: rest.unit ?? "pcs",
      quantity: rest.quantity ?? 0,
      cost_price: rest.cost_price ?? 0,
      selling_price: rest.selling_price ?? 0,
      reorder_level: rest.reorder_level ?? 0,
      notes: rest.notes ?? null,
      business_profile_id: rest.business_profile_id ?? null,
    })
    .select("*")
    .single();
  return data;
}

export async function deleteInventoryItem(client: Client, userId: string, id: string): Promise<void> {
  await client.from("inventory_items").delete().eq("id", id).eq("user_id", userId);
}

const CASH_BANK_TYPES = ["income", "transfer", "payment_received", "payment_made"] as const;
export type CashBankTransactionType = (typeof CASH_BANK_TYPES)[number];

export type BizTransactionInput = {
  id?: string;
  transaction_type: CashBankTransactionType;
  amount: number;
  transaction_date: string;
  account_type?: "cash" | "bank";
  account_name?: string | null;
  party_name?: string | null;
  reference_type?: "sale" | "purchase" | "expense" | "other" | null;
  reference_id?: string | null;
  notes?: string | null;
};

export async function loadBizTransactionById(client: Client, userId: string, id: string): Promise<BizTransactionRow | null> {
  const { data } = await client.from("transactions").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  return data;
}

export async function upsertBizTransaction(
  client: Client,
  userId: string,
  input: BizTransactionInput,
): Promise<BizTransactionRow | null> {
  const row = {
    transaction_type: input.transaction_type,
    amount: input.amount,
    transaction_date: input.transaction_date,
    account_type: input.account_type ?? "cash",
    account_name: input.account_name ?? null,
    party_name: input.party_name ?? null,
    reference_type: input.reference_type ?? "other",
    reference_id: input.reference_id ?? null,
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

export async function deleteBizTransaction(client: Client, userId: string, id: string): Promise<void> {
  await client
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .in("transaction_type", [...CASH_BANK_TYPES]);
}
