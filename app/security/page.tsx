import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  Cloud,
  Database,
  EyeOff,
  Fingerprint,
  Flame,
  Globe2,
  KeyRound,
  Laptop,
  Lock,
  MailCheck,
  MapPin,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security Center | FIRE Nepal",
  description:
    "Premium FIRE Nepal security center for encryption, privacy, login activity, recovery options, and financial data protection.",
};

const securityCards: Array<{
  title: string;
  body: string;
  status: string;
  icon: LucideIcon;
}> = [
  {
    title: "End-to-End Encryption",
    body: "Sensitive portfolio, cashflow, and family finance data is protected in transit with hardened encryption paths.",
    status: "Active",
    icon: Lock,
  },
  {
    title: "Two-Factor Authentication",
    body: "A second verification layer protects account access before critical financial actions are approved.",
    status: "Ready",
    icon: ShieldCheck,
  },
  {
    title: "Device Login History",
    body: "Trusted device visibility helps you review recent access across mobile, laptop, and browser sessions.",
    status: "Monitoring",
    icon: Laptop,
  },
  {
    title: "Cloud Backup",
    body: "Encrypted restore points keep your FIRE plans recoverable without exposing private financial records.",
    status: "Synced",
    icon: Cloud,
  },
  {
    title: "Biometric Login",
    body: "Fingerprint and device passkey flows are designed for fast secure access on supported devices.",
    status: "Available",
    icon: Fingerprint,
  },
  {
    title: "AI Fraud Detection",
    body: "Risk signals can flag unusual login, portfolio, reminder, and account activity before damage spreads.",
    status: "Scanning",
    icon: Brain,
  },
];

const loginActivity = [
  { device: "MacBook Pro · Safari", country: "South Korea", time: "Today · 11:42 PM", status: "Verified", icon: Laptop },
  { device: "iPhone 15 · Face ID", country: "Nepal", time: "Yesterday · 8:18 PM", status: "Trusted", icon: Smartphone },
  { device: "Chrome Browser", country: "South Korea", time: "May 26 · 9:05 AM", status: "Protected", icon: Globe2 },
];

const recoveryOptions = [
  {
    title: "Backup recovery options",
    body: "Restore access with verified email, trusted devices, and recovery codes stored outside your wallet.",
    icon: KeyRound,
  },
  {
    title: "Recovery email",
    body: "Account notices and restore approvals are routed through a verified secure recovery mailbox.",
    icon: MailCheck,
  },
  {
    title: "Secure restore",
    body: "Encrypted workspace snapshots help recover plans, reminders, and portfolio settings after device loss.",
    icon: RefreshCw,
  },
];

const privacyItems = [
  { label: "Data encryption status", value: "AES-256 ready", icon: Database },
  { label: "Portfolio privacy", value: "Local-first protected", icon: EyeOff },
  { label: "Secure API protection", value: "Session hardened", icon: Server },
];

function GlassPanel({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-white/[0.075] hover:shadow-[0_32px_110px_rgba(16,185,129,0.14)] ${className}`}
    >
      {children}
    </section>
  );
}

export default function SecurityPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020807] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute left-[-12rem] top-48 h-[32rem] w-[32rem] rounded-full bg-lime-300/8 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-8rem] h-[38rem] w-[38rem] rounded-full bg-cyan-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <nav className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-lime-300 shadow-[0_0_34px_rgba(16,185,129,0.45)] transition group-hover:scale-105">
              <Flame className="h-5 w-5 fill-emerald-950 text-emerald-950" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black uppercase tracking-[0.22em] text-emerald-100">FIRE Nepal</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/55">Security Center</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-300/10 hover:shadow-[0_0_35px_rgba(16,185,129,0.22)]"
          >
            Back home
            <ArrowRight size={14} aria-hidden />
          </Link>
        </nav>

        <section className="grid gap-6 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-14">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
              <ShieldCheck size={14} className="text-emerald-300" aria-hidden />
              Bank-level security layer
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Your Financial Data is Protected
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-emerald-50/68 sm:text-lg">
              FIRE Nepal protects your plans, portfolio, remittance goals, and family financial records with bank-level
              security controls, privacy-first architecture, and modern fintech-grade monitoring.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-100">
                <Lock size={16} aria-hidden />
                Encrypted session active
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/80">
                <Activity size={16} aria-hidden />
                Live risk monitoring
              </span>
            </div>
          </div>

          <GlassPanel className="relative overflow-hidden p-5 sm:p-6">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-300/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Protection score</p>
                  <p className="mt-2 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">96%</p>
                </div>
                <span className="grid h-14 w-14 place-items-center rounded-3xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 shadow-[0_0_34px_rgba(16,185,129,0.2)]">
                  <ShieldAlert size={27} aria-hidden />
                </span>
              </div>
              <div className="mt-6 h-4 overflow-hidden rounded-full border border-white/10 bg-black/35">
                <div className="security-score-fill h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-200 shadow-[0_0_28px_rgba(52,211,153,0.6)]" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["2FA ready", "Device trusted", "No risk alerts"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                    <CheckCircle2 size={16} className="mb-2 text-emerald-300" aria-hidden />
                    <p className="text-xs font-black text-emerald-50">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {securityCards.map(({ title, body, status, icon: Icon }) => (
            <GlassPanel key={title} className="group p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-200 transition duration-300 group-hover:scale-105 group-hover:bg-emerald-300/16 group-hover:shadow-[0_0_28px_rgba(16,185,129,0.22)]">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                  {status}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50/62">{body}</p>
            </GlassPanel>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassPanel className="overflow-hidden p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Recent Login Activity</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Trusted access timeline</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                <Clock3 size={14} aria-hidden />
                Live audit
              </span>
            </div>
            <div className="space-y-3">
              {loginActivity.map(({ device, country, time, status, icon: Icon }) => (
                <div
                  key={`${device}-${time}`}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-black/18 p-4 transition duration-300 hover:border-emerald-300/25 hover:bg-emerald-300/[0.07] sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.07] text-emerald-200">
                      <Icon size={18} aria-hidden />
                    </span>
                    <p className="font-black text-white">{device}</p>
                  </div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-50/70">
                    <MapPin size={14} aria-hidden />
                    {country}
                  </p>
                  <p className="text-sm font-semibold text-white/55">{time}</p>
                  <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Emergency Recovery</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Recovery built for real life</h2>
            <div className="mt-5 space-y-3">
              {recoveryOptions.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">
                      <Icon size={18} aria-hidden />
                    </span>
                    <p className="font-black text-white">{title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-50/60">{body}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>

        <GlassPanel className="mb-8 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Privacy Protection</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Private by design, premium by default.</h2>
              <p className="mt-3 text-sm leading-relaxed text-emerald-50/62">
                FIRE Nepal keeps financial intelligence guarded with encryption status visibility, portfolio privacy,
                and secure API protection across the product surface.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {privacyItems.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-black/20 p-4 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-emerald-300/[0.07]">
                  <Icon size={20} className="text-emerald-200" aria-hidden />
                  <p className="mt-4 text-sm font-bold text-emerald-50/60">{label}</p>
                  <p className="mt-1 text-lg font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
