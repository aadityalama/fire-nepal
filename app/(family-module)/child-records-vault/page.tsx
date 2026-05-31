import type { Metadata } from "next";
import { ChildRecordsVaultDashboard } from "@/components/family-module/ChildRecordsVaultDashboard";

export const metadata: Metadata = {
  title: "Child Records & Vault | FIRE Nepal",
  description:
    "Secure school fee history, exam results, GPA analytics, subject trends, and HD document vault with IndexedDB storage.",
};

export default function ChildRecordsVaultPage() {
  return <ChildRecordsVaultDashboard />;
}
