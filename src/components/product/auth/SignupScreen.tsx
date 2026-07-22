"use client";

import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AuthGlassShell } from "@/components/product/auth/AuthGlassShell";
import { AvatarUploadZone } from "@/components/product/auth/AvatarUploadZone";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FORM_MESSAGES, focusFirstInvalid } from "@/lib/ux/form-messages";

export function SignupScreen() {
  const { signup, user, loading } = useProductAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/onboarding");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 6) {
      setError(FORM_MESSAGES.passwordTooShort);
      focusFirstInvalid(formRef.current);
      return;
    }
    if (password !== confirmPassword) {
      setError(FORM_MESSAGES.passwordsMismatch);
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    const r = await signup(name, email, password, {
      confirmPassword,
      avatarUrl,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Could not create account. Please try again.");
      return;
    }
    if ("needsVerification" in r && r.needsVerification) {
      if (r.devCode) {
        sessionStorage.setItem(`fn_dev_otp_${r.email}`, r.devCode);
      }
      const q = new URLSearchParams({
        email: r.email,
        expiresAt: String(r.expiresAt),
      });
      if (isSupabaseConfigured()) q.set("provider", "supabase");
      router.push(`/verify-email?${q.toString()}`);
      return;
    }
    router.replace("/onboarding");
  }

  return (
    <AuthGlassShell wide>
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
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Create account</h1>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200/45">Email verification required</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-emerald-100/65">
            Portfolio, cashflow, and intelligence stay local-first in your browser. We activate your workspace only after
            you confirm your email with a one-time code.
          </p>

          <form ref={formRef} className="mt-8 space-y-4" onSubmit={onSubmit} aria-busy={busy}>
            <AvatarUploadZone value={avatarUrl} onChange={setAvatarUrl} disabled={busy} />

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Full name</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="Sita Magar"
                autoComplete="name"
                enterKeyHint="next"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                inputMode="email"
                enterKeyHint="next"
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
              <span className="mt-1.5 block text-[11px] font-semibold text-emerald-200/40">We’ll send a one-time verification code here.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                enterKeyHint="next"
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                minLength={6}
                aria-invalid={error?.toLowerCase().includes("password") ? true : undefined}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
                Confirm password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                enterKeyHint="go"
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="Re-enter the same password"
                autoComplete="new-password"
                required
                minLength={6}
                aria-invalid={error?.toLowerCase().includes("match") ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </label>
            {error ? (
              <p id={errorId} role="alert" aria-live="assertive" className="text-sm font-semibold text-rose-300">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-emerald-400/35 disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" aria-hidden />
              ) : null}
              {busy ? "Sending code…" : "Continue — verify email"}
              {!busy ? <ArrowRight size={18} className="transition group-hover:translate-x-0.5" /> : null}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-zinc-400">
            Already have access?{" "}
            <Link href="/login" className="font-black text-emerald-300 hover:text-white">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthGlassShell>
  );
}
