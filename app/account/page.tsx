"use client";

import { ArrowRight, LogOut, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";

export default function AccountPage() {
  const { user, loading, logout } = useProductAuth();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    await logout();
    setBusy(false);
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-emerald-100/80">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
          aria-hidden
        />
        <p className="text-sm font-semibold">Loading your workspace…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-400/18 bg-white/[0.04] p-6 text-center backdrop-blur-xl">
        <p className="text-sm font-semibold text-emerald-100/80">You are signed out or the session could not be verified.</p>
        <Link
          href="/login?next=%2Faccount"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-sm font-black text-emerald-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-up">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Account</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Profile & security</h1>
        <p className="mt-2 text-sm font-medium text-emerald-100/65">
          Mock SaaS layer — swap these endpoints for your auth provider without touching portfolio engines.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-400/18 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950">
            <UserRound size={22} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">{user.name}</p>
            <p className="truncate text-sm font-semibold text-emerald-100/70">{user.email}</p>
            <p className="mt-2 text-[11px] font-medium text-zinc-500">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-emerald-100">
          <Shield size={16} className="text-lime-300" />
          Session
        </div>
        <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-400">
          You are signed in with an httpOnly cookie plus a local mirror for instant client reads. Clearing browser data signs
          you out everywhere on this device.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/hub"
          className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-white/[0.06] px-4 py-2.5 text-sm font-black text-emerald-50 transition hover:border-emerald-300/40 hover:bg-white/10"
        >
          Back to hub
          <ArrowRight size={16} />
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={onLogout}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm font-black text-white shadow-lg transition enabled:hover:bg-rose-500 disabled:opacity-50"
        >
          <LogOut size={16} />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
