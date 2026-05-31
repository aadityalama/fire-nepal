import { BadgeCheck, Fingerprint, Lock, Shield, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Small emerald “encryption / bank-grade” pill for marketing & dashboard chrome. */
export function EncryptionBadge({ children = "AES-256 ready" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
      <Lock size={11} className="opacity-90" aria-hidden />
      {children}
    </span>
  );
}

export function SecureSessionPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-100">
      <Shield size={11} className="opacity-90" aria-hidden />
      Secure session
    </span>
  );
}

export function ProtectedDashboardLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
      <ShieldCheck size={12} aria-hidden />
      Protected workspace
    </span>
  );
}

export function VerifiedAccountIndicator({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 ${className}`}
      title="Verified account"
    >
      <BadgeCheck size={14} className="text-emerald-600" aria-hidden />
      Verified
    </span>
  );
}

export function SecurityShieldIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-lime-400/15 text-emerald-700 ring-1 ring-emerald-400/25 ${className}`}>
      <Shield className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function TrustBullet({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex h-full min-h-0 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition hover:border-emerald-400/25 hover:bg-white/[0.07]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-100/65">{body}</p>
      </div>
    </div>
  );
}

export function FingerprintLockIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-emerald-700 ${className}`}>
      <Fingerprint size={16} aria-hidden />
      <Lock size={14} aria-hidden />
    </span>
  );
}
