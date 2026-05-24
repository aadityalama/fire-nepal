"use client";

import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGlassShell } from "@/components/product/auth/AuthGlassShell";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { DEFAULT_POST_LOGIN_PATH, sanitizeInternalNextPath } from "@/lib/auth-redirect";

function decodeNext(raw: string | null): string {
  return sanitizeInternalNextPath(raw, DEFAULT_POST_LOGIN_PATH);
}

export function LoginScreen() {
  const { login, user, loading } = useProductAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = decodeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace(next);
  }, [loading, user, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await login(email, password, rememberMe);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Could not sign in.");
      return;
    }
    router.replace(next);
  }

  return (
    <AuthGlassShell>
      {loading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-emerald-400/15 bg-white/[0.03] p-10 backdrop-blur-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" aria-hidden />
          <p className="text-sm font-semibold text-emerald-100/75">Checking your session…</p>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/25 ring-1 ring-white/15">
              <Flame size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Sign in</h1>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200/45">Secure workspace access</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-emerald-100/65">
            Encrypted session cookie, bank-grade transport, and local-first dashboards after authentication.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="you@company.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-emerald-100/80">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-400/40 bg-black/40 text-emerald-500 focus:ring-emerald-500/40"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm font-black text-emerald-300 transition hover:text-white">
                Forgot password?
              </Link>
            </div>

            {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-emerald-400/35 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Continue"}
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-zinc-400">
            New here?{" "}
            <Link href="/signup" className="font-black text-emerald-300 hover:text-white">
              Create an account
            </Link>
          </p>
        </div>
      )}
    </AuthGlassShell>
  );
}
