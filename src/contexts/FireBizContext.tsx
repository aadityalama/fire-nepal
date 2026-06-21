"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  BusinessProfileRow,
  CreditReminderRow,
  CustomerRow,
  ExpenseCategoryRow,
  FireBizDashboardSummary,
  FireBizLocale,
  InventoryItemRow,
  PaymentMethod,
  PurchaseOrderRow,
  PurchaseOrderStatus,
  PurchaseRow,
  SaleRow,
  SupplierRow,
  BizTransactionRow,
} from "@/lib/fire-biz/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { Database } from "@/types/supabase-database";
import {
  deleteExpense,
  deletePurchaseOrder,
  ensureDefaultExpenseCategories,
  loadBizTransactions,
  loadBusinessProfile,
  loadCreditReminders,
  loadCustomers,
  loadExpenseCategories,
  loadFireBizDashboardSummary,
  loadInventoryItems,
  loadPurchaseOrders,
  loadPurchases,
  loadSales,
  loadSuppliers,
  updatePurchaseOrderStatus,
  updateSalePayment,
  upsertExpense,
  upsertExpenseCategory,
  upsertPurchaseOrder,
  upsertBusinessProfile,
  type PurchaseOrderInput,
} from "@/services/fire-biz-supabase";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";

type ExpenseInput = {
  id?: string;
  amount: number;
  transaction_date: string;
  expense_category_id?: string | null;
  party_name?: string | null;
  account_type?: "cash" | "bank";
  notes?: string | null;
};

type FireBizContextValue = {
  locale: FireBizLocale;
  setLocale: (locale: FireBizLocale) => void;
  loading: boolean;
  summary: FireBizDashboardSummary;
  profile: BusinessProfileRow | null;
  customers: CustomerRow[];
  suppliers: SupplierRow[];
  sales: SaleRow[];
  purchases: PurchaseRow[];
  inventory: InventoryItemRow[];
  transactions: BizTransactionRow[];
  creditReminders: CreditReminderRow[];
  expenseCategories: ExpenseCategoryRow[];
  purchaseOrders: PurchaseOrderRow[];
  refresh: () => Promise<void>;
  saveProfile: (patch: Database["public"]["Tables"]["business_profiles"]["Update"]) => Promise<void>;
  updateSalePayment: (saleId: string, patch: { amount_paid?: number; payment_status?: SaleRow["payment_status"]; payment_method?: PaymentMethod }) => Promise<void>;
  saveExpense: (input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (name: string) => Promise<void>;
  savePurchaseOrder: (input: PurchaseOrderInput) => Promise<void>;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
};

const EMPTY_SUMMARY: FireBizDashboardSummary = {
  receivables: 0,
  payables: 0,
  monthlySales: 0,
  monthlyPurchases: 0,
  monthlyExpenses: 0,
  cashBalance: 0,
  totalSales: 0,
  totalPurchases: 0,
  inventoryValue: 0,
};

const FireBizContext = createContext<FireBizContextValue | null>(null);

export function FireBizProvider({ children }: { children: ReactNode }) {
  const { user } = useProductAuth();
  const [locale, setLocale] = useState<FireBizLocale>("en");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FireBizDashboardSummary>(EMPTY_SUMMARY);
  const [profile, setProfile] = useState<BusinessProfileRow | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [transactions, setTransactions] = useState<BizTransactionRow[]>([]);
  const [creditReminders, setCreditReminders] = useState<CreditReminderRow[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRow[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      const uid = user.id;
      await ensureDefaultExpenseCategories(client, uid);
      const [
        summaryData,
        profileData,
        customersData,
        suppliersData,
        salesData,
        purchasesData,
        inventoryData,
        transactionsData,
        remindersData,
        categoriesData,
        ordersData,
      ] = await Promise.all([
        loadFireBizDashboardSummary(client, uid),
        loadBusinessProfile(client, uid),
        loadCustomers(client, uid),
        loadSuppliers(client, uid),
        loadSales(client, uid),
        loadPurchases(client, uid),
        loadInventoryItems(client, uid),
        loadBizTransactions(client, uid),
        loadCreditReminders(client, uid),
        loadExpenseCategories(client, uid),
        loadPurchaseOrders(client, uid),
      ]);
      setSummary(summaryData);
      setProfile(profileData);
      setCustomers(customersData);
      setSuppliers(suppliersData);
      setSales(salesData);
      setPurchases(purchasesData);
      setInventory(inventoryData);
      setTransactions(transactionsData);
      setCreditReminders(remindersData);
      setExpenseCategories(categoriesData);
      setPurchaseOrders(ordersData);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const saveProfile = useCallback(
    async (patch: Database["public"]["Tables"]["business_profiles"]["Update"]) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertBusinessProfile(client, user.id, patch);
      if (saved) setProfile(saved);
    },
    [user],
  );

  const handleUpdateSalePayment = useCallback(
    async (saleId: string, patch: { amount_paid?: number; payment_status?: SaleRow["payment_status"]; payment_method?: PaymentMethod }) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await updateSalePayment(client, user.id, saleId, patch);
      if (saved) setSales((prev) => prev.map((s) => (s.id === saleId ? saved : s)));
    },
    [user],
  );

  const handleSaveExpense = useCallback(
    async (input: ExpenseInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertExpense(client, user.id, input);
      if (saved) {
        setTransactions((prev) => {
          const idx = prev.findIndex((t) => t.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteExpense(client, user.id, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleAddExpenseCategory = useCallback(
    async (name: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertExpenseCategory(client, user.id, { name });
      if (saved) setExpenseCategories((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    },
    [user],
  );

  const handleSavePurchaseOrder = useCallback(
    async (input: PurchaseOrderInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertPurchaseOrder(client, user.id, input);
      if (saved) {
        setPurchaseOrders((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      }
    },
    [user],
  );

  const handleUpdatePurchaseOrderStatus = useCallback(
    async (id: string, status: PurchaseOrderStatus) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await updatePurchaseOrderStatus(client, user.id, id, status);
      if (saved) setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? saved : p)));
    },
    [user],
  );

  const handleDeletePurchaseOrder = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deletePurchaseOrder(client, user.id, id);
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
    },
    [user],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      loading,
      summary,
      profile,
      customers,
      suppliers,
      sales,
      purchases,
      inventory,
      transactions,
      creditReminders,
      expenseCategories,
      purchaseOrders,
      refresh,
      saveProfile,
      updateSalePayment: handleUpdateSalePayment,
      saveExpense: handleSaveExpense,
      deleteExpense: handleDeleteExpense,
      addExpenseCategory: handleAddExpenseCategory,
      savePurchaseOrder: handleSavePurchaseOrder,
      updatePurchaseOrderStatus: handleUpdatePurchaseOrderStatus,
      deletePurchaseOrder: handleDeletePurchaseOrder,
    }),
    [
      locale,
      loading,
      summary,
      profile,
      customers,
      suppliers,
      sales,
      purchases,
      inventory,
      transactions,
      creditReminders,
      expenseCategories,
      purchaseOrders,
      refresh,
      saveProfile,
      handleUpdateSalePayment,
      handleSaveExpense,
      handleDeleteExpense,
      handleAddExpenseCategory,
      handleSavePurchaseOrder,
      handleUpdatePurchaseOrderStatus,
      handleDeletePurchaseOrder,
    ],
  );

  return <FireBizContext.Provider value={value}>{children}</FireBizContext.Provider>;
}

export function useFireBiz(): FireBizContextValue {
  const ctx = useContext(FireBizContext);
  if (!ctx) throw new Error("useFireBiz must be used within FireBizProvider");
  return ctx;
}

export function useFireBizLocale(): FireBizLocale {
  return useFireBiz().locale;
}

export function useFireBizCopy() {
  const locale = useFireBizLocale();
  return FIRE_BIZ_I18N[locale];
}
