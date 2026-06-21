"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  BusinessProfileRow,
  CreditReminderRow,
  CustomerRow,
  FireBizDashboardSummary,
  FireBizLocale,
  InventoryItemRow,
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
  loadBizTransactions,
  loadBusinessProfile,
  loadCreditReminders,
  loadCustomers,
  loadFireBizDashboardSummary,
  loadInventoryItems,
  loadPurchases,
  loadSales,
  loadSuppliers,
  upsertBusinessProfile,
} from "@/services/fire-biz-supabase";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";

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
  refresh: () => Promise<void>;
  saveProfile: (patch: Database["public"]["Tables"]["business_profiles"]["Update"]) => Promise<void>;
};

const EMPTY_SUMMARY: FireBizDashboardSummary = {
  totalSales: 0,
  totalPurchases: 0,
  receivables: 0,
  payables: 0,
  cashBalance: 0,
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

  const refresh = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      const uid = user.id;
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
      refresh,
      saveProfile,
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
      refresh,
      saveProfile,
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
