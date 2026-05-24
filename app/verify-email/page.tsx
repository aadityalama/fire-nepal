import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailScreen } from "@/components/product/auth/VerifyEmailScreen";

export const metadata: Metadata = {
  title: "Verify email | FIRE Nepal",
  description: "Enter your verification code to activate your FIRE Nepal workspace.",
};

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030806] text-emerald-200">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" aria-hidden />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
