import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordScreen } from "@/components/product/auth/ResetPasswordScreen";

export const metadata: Metadata = {
  title: "Reset password | FIRE Nepal",
  description: "Set a new password for your FIRE Nepal account.",
};

function ResetFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030806] text-emerald-200">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" aria-hidden />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
