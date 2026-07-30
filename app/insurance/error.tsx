"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

async function clearClientCaches() {
  try {
    if (typeof caches !== "undefined" && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Insurance route recovery — Chrome iOS often keeps a stale /_next chunk graph
 * after deploys and surfaces Next's default "This page couldn’t load" UI.
 */
export default function InsuranceError({ error, reset }: Props) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[insurance] route error", error);
    }
  }, [error]);

  const recover = async () => {
    await clearClientCaches();
    try {
      sessionStorage.removeItem(
        `fn-asset-reloaded:${(window as Window & { __FN_BUILD_ID__?: string }).__FN_BUILD_ID__ ?? ""}`,
      );
    } catch {
      /* ignore */
    }
    // Hard navigation bypasses soft-router + bfcache stale modules.
    window.location.href = `/insurance?recover=${Date.now()}`;
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#020806] px-6 text-center text-white">
      <h1 className="text-2xl font-black tracking-tight">Insurance couldn’t load</h1>
      <p className="max-w-sm text-sm font-semibold text-emerald-100/65">
        Usually a stale Chrome cache after an update. Clear local assets and reload the workspace.
      </p>
      <p className="max-w-sm break-words text-[11px] font-mono text-rose-200/70">
        {error?.message || "Unknown client error"}
        {error?.digest ? ` · ${error.digest}` : ""}
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={() => void recover()}
          className="min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950"
        >
          Clear cache & open Insurance
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[44px] rounded-2xl border border-white/15 bg-white/[0.06] text-sm font-bold text-emerald-50"
        >
          Try again
        </button>
        <a
          href="/finance"
          className="min-h-[44px] rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-emerald-100/70"
        >
          Back to Finance
        </a>
      </div>
    </main>
  );
}
