import {
  Cloud,
  Database,
  EyeOff,
  Globe2,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { EncryptionBadge, TrustBullet } from "@/components/security/SecurityUi";

export function FireHomeTrustSection() {
  return (
    <section id="security-trust" className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-gradient-to-br from-[#041a14] via-[#06261c] to-[#030806] p-6 text-white shadow-[0_32px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <EncryptionBadge>Bank-grade encryption</EncryptionBadge>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-100/90">
                <ShieldCheck size={11} aria-hidden />
                Trust layer
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.35rem]">
              Security & privacy built like a modern fintech — for Nepalis abroad.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-50/75 sm:text-[1.05rem]">
              FIRE Nepal never sells your data. Passwords are protected with industry-standard hashing, sessions use
              hardened cookies, and your financial intelligence stays local-first until you opt into encrypted cloud sync.
            </p>
            <ul className="mt-6 space-y-2 text-sm font-semibold text-emerald-100/80">
              <li className="flex items-start gap-2">
                <Lock size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                Financial data is encrypted in transit; sensitive workspace data stays on your device by default.
              </li>
              <li className="flex items-start gap-2">
                <EyeOff size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                You control exports and deletions — we do not monetize personal financial behaviour.
              </li>
              <li className="flex items-start gap-2">
                <Globe2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                Built for Nepalis in Korea and the diaspora — NPR, KRW, and USD aware.
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5"
              >
                Create secure account
              </Link>
              <Link
                href="/dashboard/security"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-black text-emerald-50 transition hover:bg-white/10"
              >
                Security center
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <TrustBullet
              icon={Shield}
              title="Privacy-first architecture"
              body="Portfolio engines, cashflow, and OCR run in your browser. No silent data brokerage."
            />
            <TrustBullet
              icon={UserCheck}
              title="Secure authentication"
              body="Email verification, httpOnly session cookies, and premium member dashboards."
            />
            <TrustBullet
              icon={Server}
              title="Local-first intelligence"
              body="Insights are computed where you work — sync adds hardened encryption in later releases."
            />
            <TrustBullet
              icon={Cloud}
              title="Future cloud sync"
              body="Architecture reserves envelope encryption and device trust for production hardening."
            />
            <TrustBullet
              icon={Database}
              title="Production-ready path"
              body="Database-at-rest keys, refresh rotation, and anomaly alerts map cleanly to this trust surface."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
