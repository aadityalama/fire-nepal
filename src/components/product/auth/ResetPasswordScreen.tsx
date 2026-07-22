"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, startTransition, type FormEvent } from "react";
import { AuthGlassShell } from "@/components/product/auth/AuthGlassShell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FORM_MESSAGES } from "@/lib/ux/form-messages";

export function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRaw = searchParams.get("email") ?? "";
  const expiresParam = searchParams.get("expiresAt");
  const initialExpires = expiresParam ? Number(expiresParam) : NaN;

  const email = emailRaw.trim().toLowerCase();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (typeof window === "undefined" || !email) return;
    const stored = sessionStorage.getItem(`fn_dev_reset_${email}`);
    if (stored) startTransition(() => setDevHint(stored));
  }, [email]);

  useEffect(() => {
    if (!email.includes("@")) return;
    if (!Number.isFinite(initialExpires)) return;
    const t = setInterval(() => {
      if (Date.now() > initialExpires) setError((e) => e ?? "This reset window expired. Request a new code.");
    }, 2000);
    return () => clearInterval(t);
  }, [email, initialExpires]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (Number.isFinite(initialExpires) && Date.now() > initialExpires) {
      setError("This reset window expired. Request a new code from forgot password.");
      return;
    }
    if (password.length < 6) {
      setError(FORM_MESSAGES.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(FORM_MESSAGES.passwordsMismatch);
      return;
    }
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.replace(/\D/g, ""),
          password,
          confirmPassword,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not reset password. Check the code and try again.");
        return;
      }
      sessionStorage.removeItem(`fn_dev_reset_${email}`);
      router.replace("/hub");
    } catch {
      setError(FORM_MESSAGES.network);
    } finally {
      setBusy(false);
    }
  }

  if (!email || !email.includes("@")) {
    return (
      <AuthGlassShell>
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <p className="text-sm font-semibold text-emerald-100/80">
            {isSupabaseConfigured()
              ? "Production password reset uses the link in your email. After you open it, set a new password under Dashboard → Security."
              : "Missing email. Start from forgot password."}
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg"
          >
            {isSupabaseConfigured() ? "Back to forgot password" : "Request reset"} <ArrowRight size={16} />
          </Link>
          {isSupabaseConfigured() ? (
            <Link
              href="/dashboard/security"
              className="mt-4 block text-sm font-black text-emerald-300 hover:text-white"
            >
              Open Security center
            </Link>
          ) : null}
        </div>
      </AuthGlassShell>
    );
  }

  return (
    <AuthGlassShell>
      <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-lime-400/15 text-emerald-200 ring-1 ring-emerald-400/25">
            <KeyRound size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Choose a new password</h1>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-emerald-100/65">
              Enter the 6-digit code we sent to <span className="font-bold text-emerald-200/90">{email}</span>, then set
              a new password.
            </p>
          </div>
        </div>

        {devHint ? (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-100">
            <span className="font-black uppercase tracking-wider text-amber-200/90">Development</span>
            <p className="mt-1 font-mono text-sm tracking-widest text-amber-50">Code: {devHint}</p>
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={onSubmit} aria-busy={busy}>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
              6-digit code
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (error) setError(null);
              }}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.35em] text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
              placeholder="000000"
              required
            />
            <span className="mt-1.5 block text-center text-[11px] font-semibold text-emerald-200/40">
              Digits only · check spam if the email hasn’t arrived
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
              New password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={busy}
              enterKeyHint="go"
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
              placeholder="Re-enter the same password"
              required
              minLength={6}
            />
          </label>
          {error ? (
            <p id={errorId} role="alert" aria-live="assertive" className="text-sm font-semibold text-rose-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            aria-busy={busy}
            className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition enabled:hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" aria-hidden />
            ) : null}
            {busy ? "Saving…" : "Update password & sign in"}
            {!busy ? <ArrowRight size={18} className="transition group-hover:translate-x-0.5" /> : null}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-500">
          <Link href="/forgot-password" className="font-black text-emerald-300 hover:text-white">
            Request a new code
          </Link>
          {" · "}
          <Link href="/login" className="font-black text-emerald-300 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </AuthGlassShell>
  );
}
