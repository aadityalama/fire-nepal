"use client";

import { ArrowRight, Flame, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGlassShell } from "@/components/product/auth/AuthGlassShell";
import { useProductAuth } from "@/contexts/ProductAuthContext";

function useCountdownMs(expiresAtMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAtMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAtMs]);
  return useMemo(() => {
    if (!expiresAtMs) return null;
    return Math.max(0, expiresAtMs - now);
  }, [expiresAtMs, now]);
}

export function VerifyEmailScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailRaw = searchParams.get("email") ?? "";
  const expiresParam = searchParams.get("expiresAt");
  const provider = searchParams.get("provider");
  const initialExpires = expiresParam ? Number(expiresParam) : NaN;

  const { verifyEmail, resendVerification, user, loading } = useProductAuth();
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(
    Number.isFinite(initialExpires) ? initialExpires : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);

  const email = emailRaw.trim().toLowerCase();
  const remainingMs = useCountdownMs(expiresAt);
  const isSupabaseEmail = provider === "supabase";

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/onboarding");
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !email) return;
    const stored = sessionStorage.getItem(`fn_dev_otp_${email}`);
    if (stored) setDevHint(stored);
  }, [email]);

  const mmss = useMemo(() => {
    if (remainingMs == null) return "—:—";
    const s = Math.ceil(remainingMs / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }, [remainingMs]);

  const expired = remainingMs !== null && remainingMs === 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await verifyEmail(email, code.replace(/\D/g, ""));
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Verification failed.");
      return;
    }
    sessionStorage.removeItem(`fn_dev_otp_${email}`);
    router.replace("/onboarding");
  }

  const onResend = useCallback(async () => {
    setError(null);
    setResendBusy(true);
    const r = await resendVerification(email);
    setResendBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Could not resend code.");
      return;
    }
    if (r.expiresAt) setExpiresAt(r.expiresAt);
    if (r.devCode) {
      sessionStorage.setItem(`fn_dev_otp_${email}`, r.devCode);
      setDevHint(r.devCode);
    }
    setCode("");
  }, [email, resendVerification]);

  if (!email || !email.includes("@")) {
    return (
      <AuthGlassShell>
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <p className="text-sm font-semibold text-emerald-100/80">Missing email. Start from the sign-up form.</p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg"
          >
            Go to sign up <ArrowRight size={16} />
          </Link>
        </div>
      </AuthGlassShell>
    );
  }

  if (isSupabaseEmail) {
    return (
      <AuthGlassShell>
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-lime-400/15 text-emerald-200 ring-1 ring-emerald-400/25">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Confirm your email</h1>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-emerald-100/65">
                We sent a secure link to <span className="font-bold text-emerald-200/90">{email}</span>. Open it on
                this device to finish activating your workspace. If your project also sends a one-time code, you can
                enter it below.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-center text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25"
            >
              I confirmed — sign in <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              disabled={resendBusy}
              onClick={() => void onResend()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw size={16} className={resendBusy ? "animate-spin" : ""} />
              {resendBusy ? "Sending…" : "Resend email"}
            </button>
          </div>

          <form className="mt-10 space-y-4 border-t border-white/10 pt-8" onSubmit={onSubmit}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/45">Optional OTP</p>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
                6-digit code (if enabled in Supabase)
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.35em] text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
                placeholder="••••••"
              />
            </label>
            {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-white/[0.06] px-4 py-3 text-sm font-black text-emerald-50 transition enabled:hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify with code"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-zinc-500">
            Wrong email?{" "}
            <Link href="/signup" className="font-black text-emerald-300 hover:text-white">
              Sign up again
            </Link>
          </p>
        </div>
      </AuthGlassShell>
    );
  }

  return (
    <AuthGlassShell>
      <div className="rounded-[1.5rem] border border-emerald-400/18 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-lime-400/15 text-emerald-200 ring-1 ring-emerald-400/25">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Verify your email</h1>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-emerald-100/65">
              We sent a 6-digit code to <span className="font-bold text-emerald-200/90">{email}</span>. Enter it below to
              activate your account.
            </p>
          </div>
        </div>

        {devHint ? (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-100">
            <span className="font-black uppercase tracking-wider text-amber-200/90">Development</span>
            <p className="mt-1 font-mono text-sm tracking-widest text-amber-50">Code: {devHint}</p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/45">Code expires in</p>
            <p className="mt-0.5 font-mono text-lg font-black text-white">{mmss}</p>
            {remainingMs == null ? (
              <p className="mt-1 max-w-[220px] text-[10px] font-semibold leading-snug text-emerald-200/40">
                Opened this page directly? Tap resend to sync the 5-minute window.
              </p>
            ) : null}
          </div>
          {expired ? (
            <span className="text-xs font-bold text-rose-300">Expired</span>
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Flame size={18} />
            </span>
          )}
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
              6-digit code
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.35em] text-white outline-none ring-emerald-400/30 placeholder:text-zinc-600 focus:ring-2"
              placeholder="••••••"
              required
            />
          </label>
          {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || code.length !== 6 || expired}
            className="group flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-emerald-400/35 disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Activate account"}
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={resendBusy}
            onClick={() => void onResend()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw size={16} className={resendBusy ? "animate-spin" : ""} />
            {resendBusy ? "Sending…" : "Resend code"}
          </button>
          <Link href="/signup" className="text-center text-sm font-bold text-emerald-300/90 hover:text-white sm:text-right">
            ← Change email
          </Link>
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-zinc-500">
          Already verified?{" "}
          <Link href="/login" className="font-black text-emerald-300 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </AuthGlassShell>
  );
}
