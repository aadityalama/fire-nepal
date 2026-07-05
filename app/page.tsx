import {
  ArrowRight,
  Banknote,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Building2,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  CreditCard,
  Flame,
  Globe2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  PiggyBank,
  Plane,
  Play,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FireDashboardSection } from "@/components/FireDashboardSection";
import { ProductHomeMobileDock } from "@/components/product/landing/ProductHomeMobileDock";
import { ProductMarketingNav } from "@/components/product/landing/ProductMarketingNav";
import { PremiumHeroSection } from "@/components/product/landing/PremiumHeroSection";
import { CommunityReviewsSection } from "@/components/community-reviews/CommunityReviewsSection";
import { FireHomeTrustSection } from "@/components/security/FireHomeTrustSection";
import { HomeTopInfoBar } from "@/components/smart-nepal-info/HomeTopInfoBar";
import { buildHomepageMetadata } from "@/lib/brand/site-seo";

export const metadata = buildHomepageMetadata();

const tools: Array<[string, string, string, LucideIcon]> = [
  ["FIRE Biz", "Sales, inventory, customers, and credit reminders for your shop", "/fire-biz", LayoutGrid],
  ["Currency Converter", "KRW to NPR live planning", "/currency-converter", CircleDollarSign],
  ["Family Wealth + Child Education", "Plan your family's future, child education, savings and long-term wealth goals.", "/family", GraduationCap],
  ["Remittance Calculator", "Compare fees and timing", "/remittance-calculator", CreditCard],
  ["SIP Calculator", "Monthly investing growth", "/sip-calculator", BarChart3],
  ["SWP Calculator", "Safe withdrawal & retirement drawdown", "/swp-calculator", LineChart],
  ["Cashflow Dashboard", "Income, savings rate & emergency runway", "/cashflow-dashboard", Banknote],
  ["FIRE Summary", "Net worth, cashflow & 25× progress in one view", "/fire-summary", LayoutDashboard],
  ["Korea Pension + Severance", "Salary slip OCR, pension & severance", "/korea-pension-dashboard", Building2],
  ["Loan Calculator", "EMI for Nepal return", "/loan-calculator", Landmark],
  ["Inflation Calculator", "Future value in NPR", "/inflation-calculator", TrendingUp],
  ["खर्च हिसाब खाता", "Roommate food & room expense settlement", "/expense-dashboard", Calculator],
];

const fireTools: Array<[string, string, string, LucideIcon]> = [
  ["FIRE Biz", "Business desk — sales, purchases, stock, and receivables", "/fire-biz", LayoutGrid],
  ["FIRE Summary", "Unified net worth, runway & FIRE %", "/fire-summary", LayoutDashboard],
  ["Cashflow Dashboard", "Income, burn, emergency fund & FIRE speed", "/cashflow-dashboard", Banknote],
  ["Expense Tracker", "Track personal daily expenses", "/finance/expense", ReceiptText],
  ["Savings Tracker", "Monthly KRW/NPR savings growth", "#dashboard", PiggyBank],
  ["Reminder Planner", "Bills, visa, SIP, insurance reminders", "#learn", CalendarCheck],
  ["SIP Calculator", "Long term investment growth calculator", "/sip-calculator", BarChart3],
  ["SWP Calculator", "Inflation-aware withdrawal & runway", "/swp-calculator", LineChart],
  ["Korea Pension + Severance", "OCR payslips, 국민연금 & 퇴직금", "/korea-pension-dashboard", Building2],
  ["Currency Converter", "KRW to NPR live conversion", "/currency-converter", CircleDollarSign],
  ["Return Planner", "Nepal return target planning", "#investments", Plane],
  ["Emergency Fund", "Safety fund progress tracker", "#investments", ShieldCheck],
  ["Investment Planner", "Stocks, SIP, mutual fund planning", "#investments", Coins],
];

const videos: Array<[string, string, string]> = [
  ["Overseas income to FIRE strategy", "9:05", "from-green-950 to-emerald-700"],
  ["Passive income after returning", "12:18", "from-amber-600 to-yellow-400"],
  ["Nepal bazaar investment basics", "8:29", "from-slate-900 to-green-700"],
];

const posts: Array<[string, string, string]> = [
  ["How to invest your abroad salary for Nepal goals", "Money guide", "5 min read"],
  ["FIRE mistakes Nepali workers make abroad", "Retirement", "7 min read"],
  ["Multi-currency remittance: what to track before coming home", "Currency", "4 min read"],
];

const operatingSystemCards: Array<[string, string, string, LucideIcon]> = [
  ["Retirement Readiness", "82% ready for Nepal return", "FIRE score updates live", ShieldCheck],
  ["Goal Tracking", "Kathmandu corpus target", "रु 2.41Cr target mapped", BarChart3],
  ["Emergency Planner", "7.8 months protected", "Safety fund on track", WalletCards],
  ["Shared Room Finance", "Roommate expenses settled", "Open expense dashboard", UsersRound],
];

const smartInsights: Array<[string, string, LucideIcon]> = [
  ["AI Recommendation", "Increase monthly savings by ₩180K to reach FIRE 14 months earlier.", Brain],
  ["Smart Notification", "Visa renewal and insurance reminder due in 18 days.", Bell],
  ["Currency Insight", "KRW/NPR is favorable today for planned remittance.", CircleDollarSign],
];

const footerSections = [
  {
    heading: "Tools",
    links: [
      { label: "FIRE Calculator", href: "#dashboard" },
      { label: "Savings Tracker", href: "/savings-tracker" },
      { label: "Investment Planner", href: "#investments" },
      { label: "AI Calculator", href: "/dashboard/ai-coach" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Blog", href: "#learn" },
      { label: "YouTube Videos", href: "#learn" },
      { label: "FIRE Guide", href: "#learn" },
      { label: "🇳🇵 Nepal Economy", href: "/learn/nepal-economy" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
];

function SectionCard({
  children,
  className = "",
  id,
}: Readonly<{
  children: ReactNode;
  className?: string;
  id?: string;
}>) {
  return (
    <section id={id} className={`glass-card soft-gradient-border hover-lift rounded-[1.7rem] p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

function SmartFinancialToolCard({
  href,
  children,
  className = "",
}: Readonly<{
  href: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <Link
      href={href}
      className={`glass-card soft-gradient-border group relative flex h-full cursor-pointer touch-manipulation flex-col overflow-hidden rounded-[1.7rem] p-5 transition duration-200 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_18px_48px_rgba(0,122,61,0.16)] active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:p-6 ${className}`}
    >
      {children}
    </Link>
  );
}

function SmartFinancialToolCta({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span
      aria-hidden="true"
      className="glow-button pointer-events-none mt-auto inline-flex w-full items-center justify-center rounded-2xl bg-emerald-700 py-3.5 text-base font-black text-white transition group-hover:-translate-y-0.5 group-hover:bg-emerald-800 group-active:translate-y-0"
    >
      {children}
    </span>
  );
}

function ProgressRing({ value, size = "lg" }: { value: number; size?: "sm" | "lg" }) {
  const dimensions = size === "lg" ? "h-28 w-28" : "h-20 w-20";

  return (
    <div
      className={`grid ${dimensions} place-items-center rounded-full`}
      style={{
        background: `conic-gradient(#007a3d ${value * 3.6}deg, #dceee4 0deg)`,
      }}
    >
      <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-white text-center">
        <span className="text-xl font-black text-emerald-800">{value}%</span>
      </div>
    </div>
  );
}

function FinancialOperatingSystem() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
      <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-7 lg:p-8">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
              FIRE Nepal OS
            </p>
            <h2 className="max-w-xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              Your premium financial operating system for Nepalis worldwide.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-50/82 sm:text-[1.05rem] sm:leading-relaxed">
              One emotionally motivating dashboard for savings, FIRE readiness, emergency safety,
              AI recommendations, live currency, and roommate finance tracking.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Monthly savings", "₩1.2M"],
                ["Nepal target", "रु 2.41Cr"],
                ["FIRE ETA", "12 yrs"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-bold text-emerald-100/85">{label}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="glass-card floating-widget rounded-[1.7rem] p-4 text-emerald-950 sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-black">Live Financial Command Center</p>
                  <p className="text-sm font-bold leading-snug text-slate-500">Personalized for Nepali workers abroad</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  Live
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {operatingSystemCards.map(([title, value, detail, Icon]) => (
                  <div
                    key={title}
                    className="group rounded-2xl border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_16px_36px_rgba(0,122,61,0.14)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                        <Icon size={19} />
                      </div>
                      <ArrowRight className="text-emerald-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" size={15} />
                    </div>
                    <p className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</p>
                    <p className="mt-1 text-xl font-black leading-tight text-emerald-950">{value}</p>
                    <p className="mt-1 text-sm font-bold leading-snug text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card floating-widget-delayed mt-4 rounded-[1.5rem] p-4 text-emerald-950">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="text-emerald-700" size={18} />
                <p className="font-black">AI-powered insights</p>
              </div>
              <div className="space-y-2">
                {smartInsights.map(([title, insight, Icon]) => (
                  <div key={title} className="flex gap-3 rounded-2xl bg-white/72 p-3 text-sm shadow-sm">
                    <Icon className="mt-0.5 shrink-0 text-emerald-700" size={16} />
                    <div>
                      <p className="font-black text-emerald-950">{title}</p>
                      <p className="text-sm font-semibold leading-relaxed text-slate-600">{insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="premium-shell overflow-hidden pb-20 sm:pb-0">
      <HomeTopInfoBar />

      <ProductMarketingNav />

      <PremiumHeroSection />

      <FireHomeTrustSection />

      <section className="relative mx-auto -mt-6 max-w-7xl px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
        <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Tools Hub
              </p>
              <h2 className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
                Popular FIRE Tools
              </h2>
              <p className="mt-2 text-base font-semibold leading-relaxed text-slate-600 sm:text-[1.05rem]">
                Smart financial tools built for Nepalis abroad
              </p>
            </div>
            <a
              href="#dashboard"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-emerald-50"
            >
              Explore Dashboard <ArrowRight size={15} />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fireTools.map(([title, description, href, Icon]) => (
              <Link
                key={title}
                href={href}
                className="group relative overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/68 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:bg-white/90 hover:shadow-[0_18px_48px_rgba(0,122,61,0.16)] focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl transition group-hover:bg-emerald-400/20" />
                <div className="relative mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                    <Icon size={21} />
                  </div>
                  <ArrowRight className="text-emerald-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" size={16} />
                </div>
                <h3 className="relative text-lg font-black leading-snug text-emerald-950 sm:text-xl">{title}</h3>
                <p className="relative mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-50">
                  <div className="h-full w-10 rounded-full bg-gradient-to-r from-emerald-700 to-lime-400 transition-all duration-300 group-hover:w-full" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinancialOperatingSystem />

      <div id="dashboard" className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <FireDashboardSection />

        <div id="investments" className="mt-8 grid auto-rows-fr gap-6 sm:mt-10 md:grid-cols-2 xl:grid-cols-5">
          <SmartFinancialToolCard href="/cost-of-living">
            <Globe2 className="mb-4 h-6 w-6 text-emerald-700" />
            <h3 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Nepal Cost of Living</h3>
            <div className="mt-4 flex flex-1 flex-col justify-start gap-3 text-sm">
              {[
                ["City life", "रु 50,000 / month"],
                ["Village life", "रु 30,000 / month"],
                ["Minimum life", "रु 20,000 / month"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur">
                  <span className="font-bold text-slate-600">{label}</span>
                  <span className="font-black text-emerald-900">{value}</span>
                </div>
              ))}
            </div>
            <SmartFinancialToolCta>Calculate Now</SmartFinancialToolCta>
          </SmartFinancialToolCard>

          <SmartFinancialToolCard href="/investment-planner">
            <Coins className="mb-4 h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Investment Planner</h3>
            <div className="mt-4 flex flex-1 flex-col justify-start gap-3 text-sm">
              {[
                ["Mutual Funds", "12-15%"],
                ["Stock Market", "15-20%"],
                ["Real Estate", "8-12%"],
                ["Fixed Deposit", "6-8%"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="font-bold text-slate-600">{label}</span>
                  <span className="font-black text-emerald-900">{value}</span>
                </div>
              ))}
            </div>
            <SmartFinancialToolCta>Compare All</SmartFinancialToolCta>
          </SmartFinancialToolCard>

          <SmartFinancialToolCard href="/savings-tracker">
            <PiggyBank className="mb-4 h-6 w-6 text-emerald-700" />
            <h3 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Savings Tracker</h3>
            <div className="mt-4 flex flex-1 flex-col gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Monthly savings</p>
                <p className="text-2xl font-black text-emerald-800">₩ 1,800,000</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                <p className="text-sm text-slate-500">Total saved</p>
                <p className="text-xl font-black text-emerald-950">₩ 18,75,000</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">This month progress</p>
                <div className="mt-2 h-3 rounded-full bg-emerald-100">
                  <div className="h-3 rounded-full bg-emerald-700" style={{ width: "72%" }} />
                </div>
              </div>
            </div>
            <SmartFinancialToolCta>Track Now</SmartFinancialToolCta>
          </SmartFinancialToolCard>

          <SmartFinancialToolCard href="/return-to-nepal">
            <Plane className="mb-4 h-6 w-6 text-emerald-700" />
            <h3 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Can I Return to Nepal?</h3>
            <div className="mt-4 flex flex-1 flex-col justify-start gap-5">
              <div className="flex items-center justify-center">
                <ProgressRing value={82} size="sm" />
              </div>
              <ul className="space-y-2 text-sm font-bold text-slate-600">
                {["Emergency fund", "Passive income", "Target corpus"].map((item) => (
                  <li key={item} className="flex items-center justify-between">
                    {item} <CheckCircle2 size={16} className="text-emerald-700" />
                  </li>
                ))}
              </ul>
            </div>
            <SmartFinancialToolCta>Check Details</SmartFinancialToolCta>
          </SmartFinancialToolCard>

          <SmartFinancialToolCard href="/emergency-fund">
            <ShieldCheck className="mb-4 h-6 w-6 text-emerald-700" />
            <h3 className="text-lg font-black leading-snug text-emerald-950 sm:text-xl">Emergency Fund</h3>
            <div className="mt-4 flex flex-1 flex-col justify-start gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Recommended</p>
                <p className="text-xl font-black text-emerald-950">रु 6,00,000</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Your fund</p>
                <p className="text-xl font-black text-emerald-700">रु 4,20,000</p>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm font-black text-emerald-900">
                  <span>Readiness</span>
                  <span>78%</span>
                </div>
                <div className="h-3 rounded-full bg-emerald-100">
                  <div className="h-3 rounded-full bg-emerald-700" style={{ width: "78%" }} />
                </div>
              </div>
            </div>
            <SmartFinancialToolCta>Calculate Mine</SmartFinancialToolCta>
          </SmartFinancialToolCard>
        </div>

        <SectionCard className="mt-8 sm:mt-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Popular Tools</h2>
            <a className="text-sm font-black text-emerald-700" href="#tools">View All Tools</a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {tools.map(([title, body, href, Icon]) => (
              <Link
                key={title}
                href={href}
                className="group cursor-pointer rounded-2xl border border-white/70 bg-white/65 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:bg-emerald-50/90 hover:shadow-[0_18px_45px_rgba(0,122,61,0.18)] focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                <Icon className="mb-3 text-emerald-700" size={22} />
                <p className="font-nepali text-sm font-black text-emerald-950">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-emerald-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
                  Open <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <div id="learn" className="mt-8 grid gap-6 sm:mt-10 lg:grid-cols-[1.05fr_1.05fr_0.9fr]">
          <SectionCard>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black leading-snug text-emerald-950 sm:text-2xl">Latest YouTube Videos</h2>
              <a className="text-xs font-black text-emerald-700" href="#videos">View All</a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {videos.map(([title, duration, gradient]) => (
                <article key={title} className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-1">
                  <div className={`grid h-28 place-items-center bg-gradient-to-br ${gradient} p-4 text-center text-sm font-black text-white`}>
                    <Play size={26} fill="currentColor" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-black text-emerald-950">{title}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">FIRE Nepal - {duration}</p>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black leading-snug text-emerald-950 sm:text-2xl">Latest Blog Posts</h2>
              <a className="text-xs font-black text-emerald-700" href="#blog">View All</a>
            </div>
            <div className="space-y-4">
              {posts.map(([title, tag, time], index) => (
                <article key={title} className="flex gap-4 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur transition hover:-translate-y-1">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-black text-emerald-950">{title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{tag} - {time}</p>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="text-xl font-black leading-snug text-emerald-950 sm:text-2xl">Currency Converter</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-500">KRW - South Korean Won</span>
                <input className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 font-black outline-none backdrop-blur focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" defaultValue="3,000,000" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-500">NPR - Nepalese Rupee</span>
                <input className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 font-black outline-none backdrop-blur focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" defaultValue="323,730.00" />
              </label>
              <div className="rounded-2xl border border-emerald-100/70 bg-emerald-50/80 p-4 text-sm font-bold text-emerald-900">
                1 KRW ~ 0.1079 NPR. Build remittance plans with transfer fees included.
              </div>
            </div>
          </SectionCard>
        </div>

        <section className="dark-glass-card relative mt-8 overflow-hidden rounded-[2rem] p-6 text-white md:p-8">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-emerald-100">
                <Bot size={18} /> AI Financial Advisor
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                Ask in Nepali, Korean, or English. Get a clear FIRE action plan.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-50/85 sm:text-[1.05rem]">
                Personalized advice for retirement passive income, tax-saving tips, remittance timing,
                emergency planning, and wealth building across borders and back home in Nepal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Retirement Passive", "Investment Advice", "Tax Saving Tips", "Emergency Planning", "Wealth Building"].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-emerald-50">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass-card floating-widget-delayed rounded-[1.7rem] p-4 text-emerald-950">
              <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-lime-500 text-white shadow-lg shadow-emerald-950/20">
                  <Bot />
                </div>
                <div>
                  <p className="font-black">FIRE Bot</p>
                  <p className="text-xs font-bold text-emerald-700">Online - portfolio aware</p>
                </div>
              </div>
              <div className="my-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-relaxed text-slate-700">
                Based on your abroad income, increase monthly savings, keep 6 months in NPR cash, and split new
                investments 60% mutual funds, 25% FD, 15% equities.
              </div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ask your AI advisor..."
                />
                <button className="glow-button rounded-2xl bg-emerald-700 px-5 py-3 text-base font-black text-white transition hover:-translate-y-1 hover:bg-emerald-800">
                  Ask
                </button>
              </div>
            </div>
          </div>
        </section>

        <CommunityReviewsSection />
      </div>

      <footer className="relative overflow-hidden bg-gradient-to-br from-[#021f1a] via-[#063f31] to-[#0b5f43] text-white">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="glass-card mb-8 rounded-[1.7rem] bg-white/10 p-5 text-white">
            <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <h3 className="text-2xl font-black">Stay Updated with FIRE Nepal</h3>
                <p className="mt-1 text-sm text-emerald-50/75">FIRE tips, currency alerts, and investment strategy for Nepalis abroad.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className="rounded-full border border-white/20 bg-white/90 px-5 py-3 text-sm text-emerald-950 outline-none backdrop-blur focus:ring-4 focus:ring-emerald-200/30" placeholder="Enter your email" />
                <button className="glow-button rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-emerald-400">
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>

          <div className="relative grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500">
                  <Flame fill="currentColor" />
                </div>
                <div>
                  <p className="text-lg font-black">FIRE NEPAL</p>
                  <p className="text-xs text-emerald-100">Financial Platform for Nepalis Worldwide</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/70">
                Multi-currency planning, savings tracking, investment education, and return-home readiness
                in one premium dashboard.
              </p>
            </div>
            {footerSections.map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="mb-3 font-black">{heading}</h4>
                <div className="space-y-2 text-sm text-emerald-50/70">
                  {links.map(({ label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      className="block w-fit cursor-pointer pointer-events-auto transition hover:translate-x-1 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-emerald-50/60 sm:flex-row">
            <p>&copy; 2026 FIRE Nepal. All rights reserved.</p>
            <p>Built for Nepalis living, working and studying abroad.</p>
          </div>
        </div>
      </footer>

      <ProductHomeMobileDock />
    </main>
  );
}
