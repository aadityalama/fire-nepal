import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/product/auth/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in | FIRE Nepal",
  description: "Sign in to your verified FIRE Nepal workspace with a secure session.",
};

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030806] text-emerald-200">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" aria-hidden />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginScreen />
    </Suspense>
  );
}
