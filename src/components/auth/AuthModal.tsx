"use client";

import { ArrowRight, Flame, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";

type LoginPhase = "idle" | "loading" | "signing";

export function AuthModal() {
  const { isOpen, tab, close, open } = useAuthModal();
  const { login, signup, user } = useProductAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("idle");

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setBusy(false);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRememberMe(true);
    setLoginPhase("idle");
  }, [isOpen, tab]);

  useEffect(() => {
    if (loginPhase !== "loading") return undefined;
    const timer = window.setTimeout(() => setLoginPhase("signing"), 350);
    return () => window.clearTimeout(timer);
  }, [loginPhase]);

  useEffect(() => {
    if (user && isOpen) {
      close();
    }
  }, [user, isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError(null);
      if (tab === "signup" && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setBusy(true);
      if (tab === "login") setLoginPhase("loading");
      const r =
        tab === "login"
          ? await login(email, password, rememberMe)
          : await signup(name, email, password, { confirmPassword });
      setBusy(false);
      if (!r.ok) {
        setLoginPhase("idle");
        setError(r.error ?? "Something went wrong.");
        return;
      }
      if (tab === "signup" && "needsVerification" in r && r.needsVerification) {
        if (r.devCode) {
          sessionStorage.setItem(`fn_dev_otp_${r.email}`, r.devCode);
        }
        close();
        router.push(`/verify-email?email=${encodeURIComponent(r.email)}&expiresAt=${r.expiresAt}`);
        return;
      }
      close();
      router.prefetch("/hub");
      router.push("/hub");
      console.log("[auth] Redirect completed", { next: "/hub" });
    },
    [busy, tab, login, signup, email, password, name, confirmPassword, rememberMe, close, router],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity animate-fade-in"
        aria-label="Close authentication"
        onClick={close}
      />
      <div className="relative mb-0 w-full max-w-md animate-fade-up rounded-t-[1.5rem] border border-emerald-400/20 bg-[#04140f]/95 p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:mb-0 sm:rounded-[1.5rem] sm:border sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950">
              <Flame size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">FIRE Nepal</p>
              <p className="text-sm font-black text-white">{tab === "login" ? "Sign in" : "Create account"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-white/10 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex rounded-xl border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => open("login")}
            className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-wide transition ${
              tab === "login" ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950" : "text-zinc-400"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => open("signup")}
            className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-wide transition ${
              tab === "signup" ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950" : "text-zinc-400"
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          {tab === "signup" ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
                placeholder="Sita Magar"
                autoComplete="name"
                required
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/55">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
              placeholder={tab === "login" ? "••••••" : "At least 6 characters"}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
              minLength={tab === "login" ? 6 : 6}
            />
          </label>
          {tab === "signup" ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/55">
                Confirm password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-emerald-400/30 focus:ring-2"
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
          ) : null}
          {tab === "login" ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-bold text-emerald-100/75">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={busy}
                  className="h-3.5 w-3.5 rounded border-emerald-400/40 bg-black/40 text-emerald-500"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-[11px] font-black text-emerald-300 hover:text-white" onClick={close}>
                Forgot password?
              </Link>
            </div>
          ) : null}
          {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition enabled:hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950" aria-hidden />
            ) : null}
            {tab === "login" && loginPhase === "loading"
              ? "Loading..."
              : tab === "login" && loginPhase === "signing"
                ? "Signing you in..."
                : busy
                  ? "Please wait..."
                  : tab === "login"
                    ? "Continue"
                    : "Create & verify email"}
            {!busy ? <ArrowRight size={17} /> : null}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] font-semibold text-zinc-500">
          Full experience:{" "}
          <Link href={tab === "login" ? "/login" : "/signup"} className="font-black text-emerald-300 hover:text-white" onClick={close}>
            open dedicated page
          </Link>
          {tab === "signup" ? (
            <>
              {" "}
              (avatar upload)
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
