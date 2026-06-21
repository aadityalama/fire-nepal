import type { Database } from "@/types/supabase-database";

export type BusinessProfileRow = Database["public"]["Tables"]["business_profiles"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type PurchaseRow = Database["public"]["Tables"]["purchases"]["Row"];
export type InventoryItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];
export type BizTransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type CreditReminderRow = Database["public"]["Tables"]["credit_reminders"]["Row"];

export type PaymentStatus = "paid" | "partial" | "unpaid";
export type TransactionType = BizTransactionRow["transaction_type"];
export type AccountType = BizTransactionRow["account_type"];

export type FireBizDashboardSummary = {
  totalSales: number;
  totalPurchases: number;
  receivables: number;
  payables: number;
  cashBalance: number;
  inventoryValue: number;
};

export type FireBizLocale = "en" | "ne";

export type FireBizNavKey =
  | "dashboard"
  | "sales"
  | "purchases"
  | "customers"
  | "suppliers"
  | "inventory"
  | "cashBank"
  | "creditReminders"
  | "reports"
  | "settings";

export type FireBizNavItem = {
  href: string;
  labelKey: FireBizNavKey;
  icon: string;
};
