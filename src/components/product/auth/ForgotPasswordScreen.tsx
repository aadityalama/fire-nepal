"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthGlassShell } from "@/components/product/auth/AuthGlassShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const trimmed = email.trim().toLowerCase();
      if (isSupabaseConfigured()) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const sb = getSupabaseBrowserClient();
        const { error } = await sb.auth.resetPasswordForEmail(trimmed, {
          redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
        });
        if (error) {
          setError(error.message);
          return;
        }
        setDone(true);
        return;
      }

      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Request failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGlassShell>
      <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-lime-400/15 text-emerald-200 ring-1 ring-emerald-400/25">
            <KeyRound size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Reset password</h1>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-emerald-100/65">
              Enter the email you used for FIRE Nepal. When email delivery is connected, you will receive a secure reset
              link.
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-8 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-5 text-sm font-semibold leading-relaxed text-emerald-50">
            If an account exists for that address, password reset instructions will be sent. Check your inbox (and
            spam) in a few minutes.
            <Link href="/login" className="mt-4 block text-center text-sm font-black text-emerald-300 hover:text-white">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="you@company.com"
              />
            </label>
            {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition enabled:hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm font-semibold text-zinc-500">
          Remember your password?{" "}
          <Link href="/login" className="font-black text-emerald-300 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </AuthGlassShell>
  );
}
