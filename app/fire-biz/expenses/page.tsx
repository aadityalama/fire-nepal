import type { Metadata } from "next";
import { FireBizExpensesPage } from "@/components/fire-biz/FireBizExpensesPage";

export const metadata: Metadata = {
  title: "Expenses | FIRE Biz",
  description: "Manage business expenses and categories.",
};

export default function Page() {
  return <FireBizExpensesPage />;
}
