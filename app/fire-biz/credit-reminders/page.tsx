import type { Metadata } from "next";
import { FireBizCreditRemindersPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Credit Reminders | FIRE Biz | FIRE Nepal",
  description: "Follow up on receivables and payables due dates.",
};

export default function Page() {
  return <FireBizCreditRemindersPage />;
}
