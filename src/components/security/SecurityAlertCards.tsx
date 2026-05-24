"use client";

import { AlertTriangle, CheckCircle2, KeyRound, MonitorSmartphone, ShieldAlert, Smartphone } from "lucide-react";

const ALERTS = [
  {
    id: "device",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-50",
    icon: Smartphone,
    title: "New device login",
    body: "Chrome on macOS · Seoul, KR · just now. If this was not you, rotate your password.",
  },
  {
    id: "password",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-50",
    icon: KeyRound,
    title: "Password updated",
    body: "Last change recorded for your workspace. Session cookies were refreshed.",
  },
  {
    id: "email",
    tone: "border-sky-500/25 bg-sky-500/10 text-sky-50",
    icon: CheckCircle2,
    title: "Email verified",
    body: "Your FIRE Nepal account is activated with verified email delivery.",
  },
  {
    id: "session",
    tone: "border-zinc-500/30 bg-white/[0.04] text-zinc-200",
    icon: ShieldAlert,
    title: "Session expired",
    body: "Idle timeout cleared an older tab session. Sign in again on that device if needed.",
  },
] as const;

export function SecurityAlertCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ALERTS.map((a) => (
        <div
          key={a.id}
          className={`flex gap-3 rounded-2xl border p-4 backdrop-blur-xl ${a.tone}`}
          role="status"
        >
          <a.icon className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
          <div>
            <p className="text-xs font-black uppercase tracking-wide opacity-90">{a.title}</p>
            <p className="mt-1 text-sm font-medium leading-relaxed opacity-95">{a.body}</p>
          </div>
        </div>
      ))}
      <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-50 sm:col-span-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-xs font-black uppercase tracking-wide">Suspicious login (preview)</p>
          <p className="mt-1 text-sm font-medium leading-relaxed opacity-95">
            Production will score IP velocity, impossible travel, and new ASN patterns. Demo shows layout only.
          </p>
        </div>
      </div>
    </div>
  );
}
