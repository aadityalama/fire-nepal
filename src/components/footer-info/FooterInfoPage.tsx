"use client";

import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Bot,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Coins,
  Flame,
  Globe2,
  GraduationCap,
  Home,
  Landmark,
  LineChart,
  LockKeyhole,
  Mail,
  MessageSquareText,
  PiggyBank,
  Plane,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type InfoSection = {
  title: string;
  body: string;
  icon?: LucideIcon;
};

type FooterInfoPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: InfoSection[];
  variant?: "about" | "policy" | "terms";
  showLastUpdated?: boolean;
};

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const statCards = [
  { label: "Worker Focus", value: "Korea + Abroad", icon: Globe2 },
  { label: "Planning Core", value: "FIRE + Return", icon: TrendingUp },
  { label: "Privacy Posture", value: "Local-first", icon: ShieldCheck },
];

function formatLastUpdated() {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function BrandMark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="FIRE Nepal home">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-white shadow-[0_18px_45px_rgba(16,185,129,0.3)] transition group-hover:-translate-y-0.5">
        <Flame className="h-6 w-6 fill-current" aria-hidden />
      </span>
      <span>
        <span className="block text-lg font-black uppercase tracking-tight text-white">FIRE Nepal</span>
        <span className="block text-[10px] font-black uppercase tracking-[0.26em] text-emerald-100/70">Financial Independence</span>
      </span>
    </Link>
  );
}

function LegalBadge({ showLastUpdated }: { showLastUpdated?: boolean }) {
  if (!showLastUpdated) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-50 shadow-[0_18px_45px_rgba(0,0,0,0.14)] backdrop-blur">
      <CalendarClock className="h-4 w-4 text-emerald-200" aria-hidden />
      Last Updated: {formatLastUpdated()}
    </div>
  );
}

export function FooterInfoPage({
  eyebrow,
  title,
  subtitle,
  sections,
  variant = "about",
  showLastUpdated = false,
}: FooterInfoPageProps) {
  const leadIcon = variant === "policy" ? LockKeyhole : variant === "terms" ? CheckCircle2 : Sparkles;
  const LeadIcon = leadIcon;

  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.2),transparent_28rem),radial-gradient(circle_at_85%_15%,rgba(214,168,62,0.14),transparent_26rem),linear-gradient(135deg,#031f1a_0%,#063f31_42%,#f7fbf8_42%,#ffffff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.18),transparent_28rem),radial-gradient(circle_at_85%_15%,rgba(214,168,62,0.12),transparent_26rem),linear-gradient(135deg,#020f0d_0%,#062b22_48%,#071713_100%)]">
      <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="animate-fade-up flex flex-col gap-4 rounded-[2rem] border border-white/15 bg-white/10 p-4 text-white shadow-[0_30px_90px_rgba(0,36,28,0.24)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <nav className="flex flex-wrap gap-2 text-sm font-black">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-emerald-50 transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="animate-fade-in grid gap-6 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="text-white">
            <Link href="/" className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-emerald-50 backdrop-blur transition hover:-translate-x-1 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to FIRE Nepal
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
              <LeadIcon className="h-4 w-4" aria-hidden />
              {eyebrow}
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-emerald-50/95 sm:text-lg sm:leading-9">
              {subtitle}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <LegalBadge showLastUpdated={showLastUpdated} />
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-50 backdrop-blur">
                Premium fintech design
              </span>
            </div>
          </div>

          <div className="dark-glass-card animate-fade-up relative overflow-hidden p-5 text-white sm:p-6">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">FIRE Nepal Signal</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight">Built for serious return planning.</h2>
            <p className="mt-3 text-sm font-semibold leading-[1.65] text-emerald-50/92">
              Information, privacy, and terms pages share the same trusted product language as the calculators, dashboards, and Korea worker tools.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <Icon className="h-5 w-5 text-emerald-200" aria-hidden />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/85">{label}</p>
                  <p className="mt-1 text-sm font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ title: sectionTitle, body, icon: Icon = ShieldCheck }, index) => (
            <article
              key={sectionTitle}
              className="glass-card soft-gradient-border animate-fade-up group relative overflow-hidden rounded-[1.8rem] border border-white/50 bg-white/92 p-5 shadow-[0_24px_70px_rgba(0,63,47,0.12)] backdrop-blur-2xl transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.08] sm:p-6"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl transition group-hover:bg-emerald-300/30" />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-[0_18px_40px_rgba(0,122,61,0.18)]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="relative mt-5 text-xl font-black tracking-tight text-slate-900">{sectionTitle}</h2>
              <p className="relative mt-3 text-base font-semibold leading-relaxed text-slate-700">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export function ContactPageContent() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const isReady = useMemo(
    () => Boolean(form.name.trim() && form.email.trim() && form.subject.trim() && form.message.trim()),
    [form],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady) {
      toast.error("Please complete all contact form fields.");
      return;
    }

    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
    );
    const subject = encodeURIComponent(form.subject);
    window.location.href = `mailto:support@firenepal.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email app to send the message.");
  }

  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.2),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(214,168,62,0.15),transparent_28rem),linear-gradient(135deg,#031f1a_0%,#063f31_44%,#f7fbf8_44%,#ffffff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.16),transparent_28rem),linear-gradient(135deg,#020f0d_0%,#062b22_48%,#071713_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="animate-fade-up flex flex-col gap-4 rounded-[2rem] border border-white/15 bg-white/10 p-4 text-white shadow-[0_30px_90px_rgba(0,36,28,0.24)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <nav className="flex flex-wrap gap-2 text-sm font-black">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-emerald-50 transition hover:bg-white/20">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="animate-fade-in text-white">
            <Link href="/" className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-emerald-50 backdrop-blur transition hover:-translate-x-1 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to FIRE Nepal
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
              <MessageSquareText className="h-4 w-4" aria-hidden />
              Contact Us
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-[-0.06em] sm:text-6xl">Talk to FIRE Nepal</h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-emerald-50/95 sm:text-lg sm:leading-9">
              Questions about FIRE planning, Korea worker features, privacy, partnerships, or product feedback are welcome.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                <Mail className="h-5 w-5 text-emerald-200" aria-hidden />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-100/85">Business Email</p>
                <a href="mailto:support@firenepal.com" className="mt-1 block text-lg font-black text-white">support@firenepal.com</a>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                <CalendarClock className="h-5 w-5 text-emerald-200" aria-hidden />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-100/85">Response Time</p>
                <p className="mt-1 text-lg font-black text-white">Usually within 1-2 business days</p>
              </div>
            </div>
          </div>

          <div className="glass-card soft-gradient-border animate-fade-up rounded-[2rem] border border-white/55 bg-white/92 p-5 shadow-[0_28px_80px_rgba(0,63,47,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-7">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Contact Form</h2>
            <form className="mt-6 grid gap-4" onSubmit={submitContact}>
              <ContactInput label="Name" value={form.name} onChange={(value) => updateField("name", value)} />
              <ContactInput label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
              <ContactInput label="Subject" value={form.subject} onChange={(value) => updateField("subject", value)} />
              <label className="grid gap-2 text-sm font-black text-slate-600">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  rows={6}
                  className="min-h-36 rounded-2xl border border-[#D1D5DB] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/90 dark:border-white/20 dark:bg-white/[0.08] dark:placeholder:text-slate-500"
                  placeholder="Tell us how we can help..."
                />
              </label>
              <button
                type="submit"
                className="glow-button inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-emerald-800"
              >
                Send Message
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
            <div className="mt-6 rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-300/15 dark:bg-emerald-400/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-200">Social Links</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["YouTube", "Facebook", "TikTok"].map((social) => (
                  <a
                    key={social}
                    href={`https://www.${social === "TikTok" ? "tiktok" : social.toLowerCase()}.com`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ContactInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#D1D5DB] bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/90 dark:border-white/20 dark:bg-white/[0.08] dark:placeholder:text-slate-500"
        placeholder={label}
      />
    </label>
  );
}

export const aboutSections: InfoSection[] = [
  {
    title: "Our Mission",
    body: "FIRE Nepal helps Nepali workers abroad turn overseas income into a clear path toward financial independence, family security, and a confident return home.",
    icon: Flame,
  },
  {
    title: "Why FIRE Nepal Exists",
    body: "Many workers earn more abroad but lack a unified system for savings, remittance, investing, retirement, and Nepal return decisions. FIRE Nepal brings those decisions into one practical workspace.",
    icon: Sparkles,
  },
  {
    title: "Built for Nepalis Abroad",
    body: "The platform is shaped around multi-currency planning, remittance timing, family commitments, long-distance savings goals, and the realities of building wealth across borders.",
    icon: Globe2,
  },
  {
    title: "Regional Tools, Global Platform",
    body: "From Korea pension and payslip OCR to Gulf, Japan, Europe, and North America currency stacks — FIRE Nepal combines diaspora-wide planning with deep tools where Nepalis earn most today.",
    icon: UsersRound,
  },
  {
    title: "Financial Independence Journey",
    body: "FIRE Nepal tracks the journey from emergency fund to savings rate, from investment education to portfolio discipline, and from uncertainty to a measurable FIRE target.",
    icon: TrendingUp,
  },
  {
    title: "Retirement Planning",
    body: "Retirement planning includes long-term corpus targets, safe withdrawal thinking, pension readiness, and protection for the family members who depend on your income.",
    icon: ShieldCheck,
  },
  {
    title: "Return to Nepal Planning",
    body: "Returning early is not only a number. It includes housing, family costs, passive income, healthcare, schooling, and emotional readiness for life after migration.",
    icon: CheckCircle2,
  },
];

export const privacySections: InfoSection[] = [
  {
    title: "Data Collection",
    body: "FIRE Nepal collects only the information needed to operate account access, planning tools, preferences, saved calculations, and user-requested product features.",
  },
  {
    title: "Financial Data Security",
    body: "Financial entries are treated as sensitive information. Product design prioritizes encryption-ready storage, limited access patterns, and privacy-first handling of account and planning data.",
  },
  {
    title: "OCR Payslip Privacy",
    body: "Payslip OCR features are designed around minimal extraction, user review, and avoiding unnecessary retention of raw salary documents when a workflow can use structured results instead.",
  },
  {
    title: "Cookies",
    body: "Cookies and local storage may be used to remember preferences, theme, language, authentication state, and product settings that make the service easier to use.",
  },
  {
    title: "Analytics",
    body: "Analytics may be used to understand feature usage, performance, errors, and product quality. FIRE Nepal avoids using analytics to expose private financial details.",
  },
  {
    title: "Third Party Services",
    body: "Some features may rely on trusted third-party providers for authentication, hosting, analytics, email, OCR, or financial market data. Their use is limited to the purpose of providing the service.",
  },
  {
    title: "User Rights",
    body: "Users may request access, correction, export, or deletion of personal information where applicable and technically possible.",
  },
  {
    title: "Data Deletion Requests",
    body: "Deletion requests can be sent to support@firenepal.com. We will verify the request and remove eligible data according to operational, legal, and security requirements.",
  },
];

export const termsSections: InfoSection[] = [
  {
    title: "User Responsibilities",
    body: "Users are responsible for entering accurate information, protecting their account access, reviewing outputs carefully, and using FIRE Nepal in compliance with applicable laws.",
  },
  {
    title: "Financial Disclaimer",
    body: "FIRE Nepal provides educational planning tools and general information. It does not provide personalized financial, tax, legal, or investment advice.",
  },
  {
    title: "Investment Risk Disclaimer",
    body: "All investments carry risk, including loss of principal. Historical returns, projections, and examples do not guarantee future performance.",
  },
  {
    title: "FIRE Calculator Disclaimer",
    body: "FIRE calculations are estimates based on user inputs and assumptions. Results can change due to market returns, inflation, exchange rates, income changes, and life events.",
  },
  {
    title: "Account Usage Rules",
    body: "Users may not misuse the service, attempt unauthorized access, interfere with platform security, upload harmful content, or use FIRE Nepal for fraudulent activity.",
  },
  {
    title: "Limitation of Liability",
    body: "FIRE Nepal is not liable for decisions, losses, missed opportunities, or damages arising from reliance on estimates, content, or third-party data shown in the product.",
  },
  {
    title: "Service Changes",
    body: "Features, pricing, policies, data sources, or availability may change as the product evolves. We aim to communicate material changes clearly.",
  },
  {
    title: "Termination",
    body: "Access may be suspended or terminated for misuse, security concerns, policy violations, or operational reasons. Users may also stop using the service at any time.",
  },
];

const aboutStoryParagraphs = [
  "Millions of Nepalis leave home every year in search of better opportunities.",
  "They work long hours, make sacrifices for their families, send money home, and dream of a future where money is no longer a source of stress.",
  "Yet most financial tools are not built for Nepalis abroad.",
  "FIRE Nepal was created to change that.",
  "We are building a financial ecosystem designed specifically for Nepalis worldwide - helping them track wealth, grow investments, plan retirement, manage family finances, and prepare for a successful return to Nepal.",
];

const whoWeServe = [
  "Nepali workers abroad",
  "International students",
  "Skilled professionals",
  "Business owners",
  "Families planning their future",
  "Returning migrants",
  "Early retirement planners",
];

const buildCards = [
  {
    title: "FIRE Calculator",
    body: "Advanced retirement planning and wealth forecasting tools.",
    icon: Calculator,
  },
  {
    title: "Net Worth Dashboard",
    body: "Track assets, liabilities, savings, investments, and financial growth.",
    icon: WalletCards,
  },
  {
    title: "Portfolio Tracker",
    body: "Monitor stocks, mutual funds, ETFs, crypto, gold, and other investments.",
    icon: BarChart3,
  },
  {
    title: "SSF Retirement Dashboard",
    body: "Plan long-term retirement goals with confidence.",
    icon: Landmark,
  },
  {
    title: "Return to Nepal Planner",
    body: "Prepare financially for a successful transition back home.",
    icon: Plane,
  },
  {
    title: "Family Hub",
    body: "Manage family goals, education planning, emergency funds, and household finances.",
    icon: Home,
  },
  {
    title: "AI Financial Coach",
    body: "Personalized financial guidance powered by intelligent automation.",
    icon: Bot,
  },
];

const visionPoints = [
  "Understand their finances",
  "Build long-term wealth",
  "Protect their family",
  "Plan retirement confidently",
  "Return home with dignity",
];

const valuePillars = [
  "Trust",
  "Transparency",
  "Financial Education",
  "Long-Term Thinking",
  "Family First",
  "Financial Freedom",
];

const aboutHeroStats = [
  { label: "Audience", value: "Nepalis worldwide", icon: Globe2 },
  { label: "Core Goal", value: "FIRE + family security", icon: Flame },
  { label: "Future Path", value: "Return with confidence", icon: Plane },
];

function AboutSection({
  eyebrow,
  title,
  children,
  className = "",
}: Readonly<{
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section className={`glass-card soft-gradient-border animate-fade-up rounded-[2rem] border border-white/55 bg-white/92 p-5 shadow-[0_26px_80px_rgba(0,63,47,0.13)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] sm:p-7 ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AboutFooterInfoPage() {
  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.22),transparent_30rem),radial-gradient(circle_at_88%_10%,rgba(214,168,62,0.16),transparent_28rem),linear-gradient(135deg,#031f1a_0%,#063f31_44%,#f7fbf8_44%,#ffffff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.16),transparent_30rem),radial-gradient(circle_at_88%_10%,rgba(214,168,62,0.12),transparent_28rem),linear-gradient(135deg,#020f0d_0%,#062b22_48%,#071713_100%)]">
      <div className="pointer-events-none absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="animate-fade-up flex flex-col gap-4 rounded-[2rem] border border-white/15 bg-white/10 p-4 text-white shadow-[0_30px_90px_rgba(0,36,28,0.24)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <nav className="flex flex-wrap gap-2 text-sm font-black">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-emerald-50 transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="grid gap-7 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="animate-fade-in text-white">
            <Link href="/" className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-emerald-50 backdrop-blur transition hover:-translate-x-1 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to FIRE Nepal
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
              <Sparkles className="h-4 w-4" aria-hidden />
              About FIRE Nepal
            </div>
            <h1 className="mt-6 max-w-5xl text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Empowering Nepalis Abroad to Achieve Financial Independence
            </h1>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-emerald-50/95 sm:text-lg sm:leading-9">
              FIRE Nepal is a premium financial life platform built for Nepali workers, professionals, students, and families living abroad who want to build wealth, achieve Financial Independence, Retire Early (FIRE), and return home with confidence.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {aboutHeroStats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                  <Icon className="h-5 w-5 text-emerald-200" aria-hidden />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/85">{label}</p>
                  <p className="mt-1 text-sm font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="dark-glass-card animate-fade-up relative overflow-hidden p-5 text-white sm:p-7">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute -bottom-16 left-4 h-40 w-40 rounded-full bg-yellow-300/10 blur-3xl" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Financial life platform</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Built around the Nepali migration journey.</h2>
            <div className="mt-6 grid gap-3">
              {["Earn abroad", "Support family", "Build assets", "Return prepared"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-sm font-black text-emerald-100">
                    {index + 1}
                  </span>
                  <span className="font-black text-white">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-5 pb-12">
          <AboutSection eyebrow="Our Story" title="Created for the sacrifices behind every remittance">
            <div className="mx-auto grid max-w-prose gap-5 text-sm font-semibold leading-[1.75] text-slate-700 sm:text-base sm:leading-[1.8] lg:max-w-[68ch] lg:text-[1.0625rem] lg:leading-[1.82]">
              {aboutStoryParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </AboutSection>

          <AboutSection eyebrow="Founder" title="Founder of FIRE Nepal">
            <p className="text-base font-semibold leading-8 text-slate-700">
              Raj Kumar Ghalan is the Founder of FIRE Nepal, an all-in-one financial platform helping Nepalis worldwide achieve Financial Independence, Retire Early (FIRE) and confidently plan their return to Nepal.
            </p>
            <Link
              href="/founder"
              className="mt-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100"
            >
              View founder page
            </Link>
          </AboutSection>

          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <AboutSection eyebrow="Our Mission" title="Financial freedom should not be limited by geography">
              <p className="text-base font-bold leading-8 text-slate-700">
                To help every Nepali abroad achieve Financial Independence and create a secure future for their family.
              </p>
              <p className="mt-4 text-sm font-semibold leading-[1.7] text-slate-700 sm:text-base sm:leading-[1.72]">
                Whether you work in South Korea, Japan, UAE, Qatar, Saudi Arabia, Malaysia, Europe, Australia, Canada, the United States, or anywhere else in the world, FIRE Nepal exists to support your journey.
              </p>
            </AboutSection>

            <AboutSection eyebrow="What FIRE Means" title="Work becomes a choice, not a necessity">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/80 p-5 dark:border-emerald-300/15 dark:bg-emerald-400/10">
                  <PiggyBank className="h-6 w-6 text-emerald-700 dark:text-emerald-200" aria-hidden />
                  <h3 className="mt-4 text-lg font-black text-slate-900">Financial Independence</h3>
                  <p className="mt-2 text-sm font-semibold leading-[1.65] text-slate-700">
                    Building enough wealth so work becomes a choice, not a necessity.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-amber-200/70 bg-amber-50/80 p-5 dark:border-amber-300/15 dark:bg-amber-400/10">
                  <LineChart className="h-6 w-6 text-amber-700 dark:text-amber-200" aria-hidden />
                  <h3 className="mt-4 text-lg font-black text-slate-900">Retire Early</h3>
                  <p className="mt-2 text-sm font-semibold leading-[1.65] text-slate-700">
                    Creating the freedom to spend more time with family, personal goals, community service, entrepreneurship, or enjoying life on your own terms.
                  </p>
                </div>
              </div>
            </AboutSection>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
            <AboutSection eyebrow="Who We Serve" title="A platform for Nepalis building lives across borders">
              <div className="grid gap-3 sm:grid-cols-2">
                {whoWeServe.map((person) => (
                  <div key={person} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
                    <span className="text-sm font-black text-slate-900">{person}</span>
                  </div>
                ))}
              </div>
            </AboutSection>

            <AboutSection eyebrow="What We Are Building" title="One financial ecosystem for the full journey">
              <div className="grid gap-4 md:grid-cols-2">
                {buildCards.map(({ title, body, icon: Icon }) => (
                  <article key={title} className="rounded-[1.4rem] border border-emerald-100 bg-white/70 p-4 transition hover:-translate-y-1 hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.06]">
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden />
                    <h3 className="mt-3 text-base font-black text-slate-900">{title}</h3>
                    <p className="mt-1.5 text-sm font-semibold leading-[1.62] text-slate-700">{body}</p>
                  </article>
                ))}
              </div>
            </AboutSection>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <AboutSection eyebrow="Our Vision" title="The most trusted financial platform for Nepalis worldwide">
              <p className="text-sm font-semibold leading-[1.65] text-slate-700 sm:text-base">
                A platform where every Nepali abroad can:
              </p>
              <div className="mt-4 grid gap-3">
                {visionPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                    <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
                    <span className="text-sm font-black text-slate-900">{point}</span>
                  </div>
                ))}
              </div>
            </AboutSection>

            <AboutSection eyebrow="Our Values" title="The principles behind the product">
              <div className="flex flex-wrap gap-3">
                {valuePillars.map((value) => (
                  <span key={value} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-slate-900 dark:border-emerald-300/15 dark:bg-emerald-400/10 dark:text-slate-200">
                    {value}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Education", icon: GraduationCap },
                  { label: "Wealth", icon: Coins },
                  { label: "Cashflow", icon: Banknote },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-emerald-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden />
                    <p className="mt-3 text-sm font-black text-slate-900">{label}</p>
                  </div>
                ))}
              </div>
            </AboutSection>
          </section>

          <section className="dark-glass-card animate-fade-up relative overflow-hidden p-6 text-white sm:p-8 lg:p-10">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Closing Section</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                  Your journey abroad is more than earning money.
                </h2>
                <p className="mt-5 max-w-3xl text-sm font-semibold leading-[1.65] text-emerald-50/95 sm:text-base sm:leading-[1.7]">
                  It is about creating freedom, security, and opportunities for the people you love. FIRE Nepal is here to help you turn hard work into lasting wealth and a future built on your own terms.
                </p>
              </div>
              <div className="grid gap-2 text-xl font-black tracking-tight text-emerald-50 sm:text-2xl">
                <p>Build Wealth.</p>
                <p>Achieve Financial Independence.</p>
                <p>Return Home with Confidence.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function PrivacyFooterInfoPage() {
  return (
    <FooterInfoPage
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      subtitle="A clear privacy framework for financial planning, OCR payslip workflows, analytics, cookies, and data deletion requests."
      sections={privacySections}
      variant="policy"
      showLastUpdated
    />
  );
}

export function NepalEconomyFooterInfoPage() {
  return (
    <FooterInfoPage
      eyebrow="Learn"
      title="Nepal Economy"
      subtitle="Latest insights on Nepal's economy, inflation, interest rates, remittance trends, stock market, real estate, and financial opportunities."
      sections={[
        {
          title: "Nepal GDP Updates",
          body: "Track output growth, sector momentum, and macro signals that shape long-term financial planning in Nepal.",
          icon: BarChart3,
        },
        {
          title: "Inflation Reports",
          body: "Follow consumer price changes, household cost pressure, and the impact on FIRE targets and return-home budgets.",
          icon: TrendingUp,
        },
        {
          title: "NRB Policies",
          body: "Understand central bank updates, monetary policy direction, foreign exchange rules, and financial stability signals.",
          icon: Landmark,
        },
        {
          title: "Remittance Trends",
          body: "Monitor remittance flows, exchange-rate implications, and how overseas earnings continue to support Nepal's economy.",
          icon: Send,
        },
        {
          title: "Banking & Interest Rates",
          body: "Compare deposit rates, lending conditions, credit cycles, and banking trends relevant to savers and investors.",
          icon: Banknote,
        },
        {
          title: "NEPSE Market Updates",
          body: "Stay close to stock market movement, listed-sector trends, investor sentiment, and portfolio opportunities.",
          icon: LineChart,
        },
        {
          title: "Real Estate Market",
          body: "Watch land, housing, rental, and city migration trends for families planning to build or return to Nepal.",
          icon: Home,
        },
        {
          title: "Economic News",
          body: "Get curated updates on jobs, tourism, trade, infrastructure, and business opportunities across Nepal.",
          icon: Globe2,
        },
      ]}
    />
  );
}

export function TermsFooterInfoPage() {
  return (
    <FooterInfoPage
      eyebrow="Terms of Service"
      title="Terms of Service"
      subtitle="Rules, responsibilities, and disclaimers for using FIRE Nepal's calculators, dashboards, and financial planning tools."
      sections={termsSections}
      variant="terms"
      showLastUpdated
    />
  );
}
