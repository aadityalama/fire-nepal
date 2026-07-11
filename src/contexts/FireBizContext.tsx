"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  deleteBizTransaction,
  deleteCustomer,
  deleteExpense,
  deleteInventoryItem,
  deletePurchase,
  deletePurchaseOrder,
  deleteSale,
  deleteSupplier,
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
  upsertBizTransaction,
  upsertCustomer,
  upsertExpense,
  upsertExpenseCategory,
  upsertInventoryItem,
  upsertPurchase,
  upsertPurchaseOrder,
  upsertSale,
  upsertSupplier,
  upsertBusinessProfile,
  type BizTransactionInput,
  type CustomerInput,
  type InventoryItemInput,
  type PurchaseInput,
  type PurchaseOrderInput,
  type SaleInput,
  type SupplierInput,
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
  saveCustomer: (input: CustomerInput) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  saveSupplier: (input: SupplierInput) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  saveSale: (input: SaleInput) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  savePurchase: (input: PurchaseInput) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  saveInventoryItem: (input: InventoryItemInput) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  saveBizTransaction: (input: BizTransactionInput) => Promise<void>;
  deleteBizTransaction: (id: string) => Promise<void>;
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

async function loadFireBizRequired<T>(label: string, promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[fire-biz] failed to load ${label}`, error);
    }
    const message = error instanceof Error ? error.message : `Could not load FIRE Biz ${label}.`;
    throw new Error(`Could not load FIRE Biz ${label}: ${message}`);
  }
}

async function loadFireBizOptional<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[fire-biz] optional load failed: ${label}`, error);
    }
    return fallback;
  }
}

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
      try {
        await ensureDefaultExpenseCategories(client, uid);
      } catch {
        // expense_categories table may not exist until migration is applied
      }
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
        loadFireBizRequired("dashboard summary", loadFireBizDashboardSummary(client, uid)),
        loadFireBizOptional("business profile", loadBusinessProfile(client, uid), null),
        loadFireBizRequired("customers", loadCustomers(client, uid)),
        loadFireBizRequired("suppliers", loadSuppliers(client, uid)),
        loadFireBizRequired("sales history", loadSales(client, uid)),
        loadFireBizRequired("purchase history", loadPurchases(client, uid)),
        loadFireBizRequired("inventory history", loadInventoryItems(client, uid)),
        loadFireBizRequired("transaction history", loadBizTransactions(client, uid)),
        loadFireBizOptional("credit reminders", loadCreditReminders(client, uid), []),
        loadFireBizOptional("expense categories", loadExpenseCategories(client, uid), []),
        loadFireBizRequired("purchase orders", loadPurchaseOrders(client, uid)),
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load FIRE Biz history.";
      toast.error(message);
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

  const handleSaveCustomer = useCallback(
    async (input: CustomerInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertCustomer(client, user.id, input);
      if (saved) {
        setCustomers((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)].sort((a, b) => a.name.localeCompare(b.name)));
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeleteCustomer = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteCustomer(client, user.id, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleSaveSupplier = useCallback(
    async (input: SupplierInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertSupplier(client, user.id, input);
      if (saved) {
        setSuppliers((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)].sort((a, b) => a.name.localeCompare(b.name)));
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeleteSupplier = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteSupplier(client, user.id, id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleSaveSale = useCallback(
    async (input: SaleInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertSale(client, user.id, input);
      if (saved) {
        setSales((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeleteSale = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteSale(client, user.id, id);
      setSales((prev) => prev.filter((s) => s.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleSavePurchase = useCallback(
    async (input: PurchaseInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertPurchase(client, user.id, input);
      if (saved) {
        setPurchases((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeletePurchase = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deletePurchase(client, user.id, id);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleSaveInventoryItem = useCallback(
    async (input: InventoryItemInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertInventoryItem(client, user.id, input);
      if (saved) {
        setInventory((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)].sort((a, b) => a.name.localeCompare(b.name)));
        void refresh();
      }
    },
    [user, refresh],
  );

  const handleDeleteInventoryItem = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteInventoryItem(client, user.id, id);
      setInventory((prev) => prev.filter((i) => i.id !== id));
      void refresh();
    },
    [user, refresh],
  );

  const handleSaveBizTransaction = useCallback(
    async (input: BizTransactionInput) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      const saved = await upsertBizTransaction(client, user.id, input);
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

  const handleDeleteBizTransaction = useCallback(
    async (id: string) => {
      if (!user?.id || !isSupabaseConfigured()) return;
      const client = getSupabaseBrowserClient();
      await deleteBizTransaction(client, user.id, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      void refresh();
    },
    [user, refresh],
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
      saveCustomer: handleSaveCustomer,
      deleteCustomer: handleDeleteCustomer,
      saveSupplier: handleSaveSupplier,
      deleteSupplier: handleDeleteSupplier,
      saveSale: handleSaveSale,
      deleteSale: handleDeleteSale,
      savePurchase: handleSavePurchase,
      deletePurchase: handleDeletePurchase,
      saveInventoryItem: handleSaveInventoryItem,
      deleteInventoryItem: handleDeleteInventoryItem,
      saveBizTransaction: handleSaveBizTransaction,
      deleteBizTransaction: handleDeleteBizTransaction,
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
      handleSaveCustomer,
      handleDeleteCustomer,
      handleSaveSupplier,
      handleDeleteSupplier,
      handleSaveSale,
      handleDeleteSale,
      handleSavePurchase,
      handleDeletePurchase,
      handleSaveInventoryItem,
      handleDeleteInventoryItem,
      handleSaveBizTransaction,
      handleDeleteBizTransaction,
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
