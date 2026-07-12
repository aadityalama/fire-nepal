import type { Metadata } from "next";
import { Suspense } from "react";
import { FireMyProfilePage } from "@/components/dashboard/FireMyProfilePage";

export const metadata: Metadata = {
  title: "My Profile | FIRE Nepal Dashboard",
  description: "Manage your FIRE Nepal personal account information, profile details, membership, and settings.",
};

export default function DashboardProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-base font-medium text-zinc-400">
          Loading profile...
        </div>
      }
    >
      <FireMyProfilePage />
    </Suspense>
  );
}
