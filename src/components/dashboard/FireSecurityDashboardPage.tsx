"use client";

import {
  Fingerprint,
  KeyRound,
  LogOut as LogOutIcon,
  MonitorSmartphone,
  Shield,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { EncryptionBadge, ProtectedDashboardLabel, SecureSessionPill } from "@/components/security/SecurityUi";
import { SecurityAlertCards } from "@/components/security/SecurityAlertCards";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { SECURITY_ARCHITECTURE_VERSION, SECURITY_ROADMAP } from "@/lib/fire-security-architecture";

export function FireSecurityDashboardPage() {
  const { user, logout } = useProductAuth();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const onPasswordSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (pw1.length < 6) {
        setPwMsg("Use at least 6 characters.");
        return;
      }
      if (pw1 !== pw2) {
        setPwMsg("Passwords do not match.");
        return;
      }
      setPwMsg("Password updates are not persisted here yet — connect your auth provider to enable this (roadmap).");
      setPw1("");
      setPw2("");
    },
    [pw1, pw2],
  );

  if (!user) {
    return <div className="py-20 text-center text-zinc-500">Loading…</div>;
  }

  const verified = user.emailVerified === true;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-24 lg:pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ProtectedDashboardLabel />
            <SecureSessionPill />
            <EncryptionBadge>TLS + httpOnly</EncryptionBadge>
          </div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Security center</h1>
          <p className="mt-2 max-w-xl text-sm text-emerald-100/60">
            Stripe-inspired controls for verification, passwords, devices, and incident alerts. Backend hooks ship with
            production auth.
          </p>
        </div>
        <Fingerprint className="hidden h-14 w-14 text-emerald-500/40 sm:block" aria-hidden />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#04140f]/80 p-6 backdrop-blur-xl">
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300/70">Trust & data</h2>
        <ul className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-zinc-300">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            FIRE Nepal never sells user data. Analytics are aggregate-only where enabled.
          </li>
          <li className="flex gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            Passwords are hashed with modern KDFs on the server; plaintext never stored.
          </li>
          <li className="flex gap-2">
            <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            Financial intelligence defaults to encrypted transport + local device storage.
          </li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Email verification</h2>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-zinc-500">Status</p>
              <p className="mt-1 text-sm font-black text-white">{verified ? "Verified" : "Not verified"}</p>
            </div>
            {!verified ? (
              <Link
                href={`/verify-email?email=${encodeURIComponent(user.email)}`}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-emerald-950 hover:bg-emerald-400"
              >
                Verify
              </Link>
            ) : (
              <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200">
                Active
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Two-factor (2FA)</h2>
          <p className="mt-3 text-sm text-zinc-400">
            TOTP / passkeys placeholder. Enable will require authenticator app or hardware key in production.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-black text-zinc-500"
          >
            Enable 2FA (coming soon)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#04140f]/80 p-6 backdrop-blur-xl">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Change password</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onPasswordSubmit}>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-black uppercase text-emerald-200/45">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-black uppercase text-emerald-200/45">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg"
            >
              Update password
            </button>
            {pwMsg ? <p className="mt-3 text-sm font-semibold text-emerald-300">{pwMsg}</p> : null}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Active sessions</h2>
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-white">
              <MonitorSmartphone size={18} className="text-emerald-300" aria-hidden />
              This browser · current session
            </div>
            <EncryptionBadge>Active</EncryptionBadge>
          </div>
          <p className="text-xs text-zinc-500">Additional devices appear here after production session registry.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Device login history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <th className="pb-2 pr-4">Device</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              <tr className="border-b border-white/5">
                <td className="py-3 font-semibold">Desktop · Chrome</td>
                <td className="py-3">Seoul, KR</td>
                <td className="py-3 font-mono text-xs text-zinc-400">Now</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-zinc-500">Mobile · Safari</td>
                <td className="py-3 text-zinc-500">—</td>
                <td className="py-3 font-mono text-xs text-zinc-500">No history yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/20"
          onClick={() => {
            void logout();
          }}
        >
          <LogOutIcon size={18} />
          Log out this device
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black text-zinc-300"
          onClick={() =>
            alert(
              "Production: revoke all refresh tokens and invalidate sessions. This preview only clears the current browser via Sign out.",
            )
          }
        >
          <Smartphone size={18} />
          Log out all devices (preview)
        </button>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Security alerts</h2>
        <SecurityAlertCards />
      </div>

      <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-xl">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-200/80">Architecture · {SECURITY_ARCHITECTURE_VERSION}</h2>
        <ul className="mt-4 space-y-2 text-sm text-emerald-50/80">
          {SECURITY_ROADMAP.map((r) => (
            <li key={r.phase}>
              <span className="font-black text-emerald-200">{r.phase}:</span> {r.note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
