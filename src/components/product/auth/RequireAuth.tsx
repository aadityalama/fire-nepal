"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { DEFAULT_POST_LOGIN_PATH, sanitizeInternalNextPath } from "@/lib/auth-redirect";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useProductAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    const safeNext = sanitizeInternalNextPath(pathname ?? DEFAULT_POST_LOGIN_PATH, DEFAULT_POST_LOGIN_PATH);
    const next = encodeURIComponent(safeNext);
    router.replace(`/login?next=${next}`);
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-[#030806] px-6 text-center text-zinc-200">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
          aria-hidden
        />
        <p className="text-sm font-semibold tracking-wide text-emerald-100/80">Verifying secure session…</p>
        <p className="max-w-xs text-xs font-medium text-zinc-500">httpOnly cookie + local mirror for instant UI.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#030806] text-sm text-zinc-400">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
