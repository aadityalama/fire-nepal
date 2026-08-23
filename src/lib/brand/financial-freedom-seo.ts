import type { Metadata } from "next";
import {
  FIRE_NEPAL_BRAND,
  FIRE_NEPAL_CANONICAL_ORIGIN,
  FIRE_NEPAL_FOUNDER,
  buildCanonicalAlternates,
} from "@/lib/brand/site-seo";

export const FINANCIAL_FREEDOM_PATH = "/financial-freedom-nepal" as const;
export const FINANCIAL_FREEDOM_CANONICAL = `${FIRE_NEPAL_CANONICAL_ORIGIN}${FINANCIAL_FREEDOM_PATH}`;

export const FINANCIAL_FREEDOM_TITLE =
  "Financial Freedom Nepal – Build Financial Independence | FIRE Nepal";

export const FINANCIAL_FREEDOM_DESCRIPTION =
  "Learn how to achieve financial freedom in Nepal with FIRE Nepal. Plan savings, investments, retirement, SIP, SWP, emergency funds and Nepal return goals using practical financial tools.";

export const FINANCIAL_FREEDOM_KEYWORDS = [
  "Financial Freedom Nepal",
  "financial freedom in Nepal",
  "financial independence Nepal",
  "FIRE Nepal",
  "financial independence retire early Nepal",
  "FIRE movement Nepal",
  "how to achieve financial freedom in Nepal",
  "financial planning Nepal",
  "personal finance Nepal",
  "investment planning Nepal",
  "retirement planning Nepal",
  "wealth building Nepal",
  "financial freedom for Nepalis abroad",
  "financial independence for Nepali workers abroad",
  "Nepal FIRE calculator",
  "SIP calculator Nepal",
  "SWP calculator Nepal",
] as const;

export const FINANCIAL_FREEDOM_LAST_UPDATED = "2026-08-23";

export type FinancialFreedomTool = {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  public: boolean;
};

/** Public-first tool map for the Financial Freedom hub (login-gated noted). */
export const FINANCIAL_FREEDOM_TOOLS: FinancialFreedomTool[] = [
  {
    href: "/#calculator",
    title: "FIRE Calculator",
    blurb: "Estimate years to financial independence from savings rate, returns, and Nepal spending assumptions.",
    cta: "Calculate your path to financial independence with the FIRE Calculator.",
    public: true,
  },
  {
    href: "/sip-calculator",
    title: "SIP Calculator Nepal",
    blurb: "Project monthly mutual fund SIP growth in NPR with optional annual step-up.",
    cta: "Estimate long-term investment growth with the SIP Calculator.",
    public: true,
  },
  {
    href: "/swp-calculator",
    title: "SWP Calculator",
    blurb: "Model systematic withdrawals and retirement drawdown sustainability in NPR.",
    cta: "Plan sustainable retirement withdrawals with the SWP Calculator.",
    public: true,
  },
  {
    href: "/sip-calculator",
    title: "Investment Planner",
    blurb: "Stress-test monthly investing scenarios that feed your FIRE number.",
    cta: "Plan monthly investing toward financial freedom.",
    public: true,
  },
  {
    href: "/savings-tracker",
    title: "Saving Goals",
    blurb: "Track named NPR/KRW savings goals that fund emergency cash and investing surplus.",
    cta: "Build the savings habits behind financial independence.",
    public: true,
  },
  {
    href: "/emergency-fund",
    title: "Emergency Fund Calculator",
    blurb: "Size a cash buffer so market dips or job gaps do not force panic selling.",
    cta: "Protect your plan with an emergency fund target.",
    public: true,
  },
  {
    href: "/fire-summary",
    title: "FIRE Summary",
    blurb: "See net worth, cashflow, emergency coverage, and FIRE progress in one view.",
    cta: "Review your financial freedom progress at a glance.",
    public: true,
  },
  {
    href: "/fire-summary",
    title: "Net Worth Tracker",
    blurb: "Monitor assets minus liabilities — the scoreboard for wealth building in Nepal terms.",
    cta: "Track net worth as you build independence.",
    public: true,
  },
  {
    href: "/cashflow-dashboard",
    title: "Cashflow Dashboard",
    blurb: "Understand income, burn rate, savings rate, and runway.",
    cta: "Measure the cashflow that funds financial freedom.",
    public: true,
  },
  {
    href: "/expense-dashboard",
    title: "Expense Tracker",
    blurb: "Capture spending so your FIRE number is based on real costs, not guesses.",
    cta: "Know your expenses before you set a freedom target.",
    public: true,
  },
  {
    href: "/#calculator",
    title: "Retirement Planner",
    blurb: "Project retirement corpus needs using illustrative withdrawal assumptions.",
    cta: "Plan retirement readiness for life in Nepal.",
    public: true,
  },
  {
    href: "/return-to-nepal",
    title: "Nepal Return Planner",
    blurb: "Connect overseas earnings to a confident return-home financial plan.",
    cta: "Plan your return to Nepal with financial independence in mind.",
    public: true,
  },
  {
    href: "/currency-converter",
    title: "Currency Converter",
    blurb: "Convert overseas salary into NPR planning figures for remittance and investing.",
    cta: "Translate abroad income into Nepal rupee plans.",
    public: true,
  },
  {
    href: "/currency-converter",
    title: "Remittance Planning",
    blurb: "Use FX clarity to decide how much to remit for family support versus investable surplus.",
    cta: "Separate family support from wealth-building remittances.",
    public: true,
  },
  {
    href: "/smart-loan-os",
    title: "Loan / EMI Planner",
    blurb: "Model EMI pressure so debt does not quietly delay financial freedom.",
    cta: "Understand loan costs before they stall your FIRE plan.",
    public: true,
  },
  {
    href: "/inflation-calculator",
    title: "Inflation Calculator",
    blurb: "See how inflation can change future purchasing power in NPR.",
    cta: "Stress-test freedom targets against inflation.",
    public: true,
  },
  {
    href: "/tools/nepal-cost-of-living",
    title: "Nepal Cost of Living",
    blurb: "Anchor Lean, Traditional, or higher lifestyle bands to Nepal cost context.",
    cta: "Ground your FIRE number in Nepal living costs.",
    public: true,
  },
  {
    href: "/korea-pension-dashboard",
    title: "Korea Pension + Severance",
    blurb: "Track 국민연금 and severance as part of abroad-to-Nepal wealth planning.",
    cta: "Include Korea pension benefits in your independence plan.",
    public: true,
  },
  {
    href: "/insurance",
    title: "Insurance Planner",
    blurb: "Keep protection in view so a shock does not wipe out years of progress.",
    cta: "Pair insurance planning with long-term wealth building.",
    public: true,
  },
  {
    href: "/lumpsum-calculator",
    title: "Lumpsum Calculator",
    blurb: "Compare one-time investing with monthly SIP paths.",
    cta: "Compare lumpsum and SIP paths for Nepal goals.",
    public: true,
  },
  {
    href: "/market",
    title: "NEPSE Hub",
    blurb: "Follow Nepal market context while keeping portfolio decisions disciplined.",
    cta: "Stay informed on NEPSE while you build long-term plans.",
    public: true,
  },
];

export const FINANCIAL_FREEDOM_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is Financial Freedom Nepal?",
    answer:
      "Financial Freedom Nepal is FIRE Nepal’s educational hub for building financial independence in Nepal and among Nepalis worldwide — covering savings, investing, retirement math, emergency funds, remittance planning, and practical calculators.",
  },
  {
    question: "What does financial freedom mean in Nepal?",
    answer:
      "Financial freedom means having enough financial security, assets, and income to make life decisions without being completely dependent on your next paycheck. In Nepal terms, that usually means covering your chosen lifestyle in NPR with a sustainable portfolio and cash buffers.",
  },
  {
    question: "Is FIRE the same as financial freedom?",
    answer:
      "FIRE (Financial Independence, Retire Early) is one popular path toward financial freedom. You can pursue financial independence without retiring early — for example by reducing paycheck dependency while continuing meaningful work.",
  },
  {
    question: "How much money do I need for financial independence in Nepal?",
    answer:
      "It depends on your annual spending and withdrawal assumptions. A common teaching rule is roughly 25× annual expenses (about a 4% withdrawal rate). Your number should reflect Nepal cost of living, family obligations, healthcare, and risk tolerance — use the FIRE Calculator with your own inputs.",
  },
  {
    question: "Can Nepalis working abroad achieve financial freedom?",
    answer:
      "Yes — many build independence by earning abroad, protecting income, remitting intentionally, investing surplus in diversified assets, tracking net worth, and planning a Nepal return. Overseas income helps only when paired with systems, not lifestyle inflation alone.",
  },
  {
    question: "Does FIRE Nepal guarantee investment returns?",
    answer:
      "No. FIRE Nepal tools provide educational estimates based on assumptions you enter. Mutual fund and market returns are not guaranteed. Always read scheme documents and consider personal circumstances.",
  },
];

export const ABROAD_REGIONS = [
  "Korea",
  "Japan",
  "Australia",
  "UK",
  "USA",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Malaysia",
  "Europe",
] as const;

export function buildFinancialFreedomMetadata(): Metadata {
  const title = FINANCIAL_FREEDOM_TITLE;
  const description = FINANCIAL_FREEDOM_DESCRIPTION;
  const url = FINANCIAL_FREEDOM_CANONICAL;

  return {
    title: { absolute: title },
    description,
    keywords: [...FINANCIAL_FREEDOM_KEYWORDS],
    authors: [{ name: FIRE_NEPAL_BRAND.name, url: FIRE_NEPAL_CANONICAL_ORIGIN }],
    creator: FIRE_NEPAL_BRAND.name,
    publisher: FIRE_NEPAL_BRAND.name,
    category: "finance",
    alternates: buildCanonicalAlternates(FINANCIAL_FREEDOM_PATH),
    openGraph: {
      type: "website",
      locale: "en_US",
      alternateLocale: ["ne_NP", "ko_KR"],
      url,
      siteName: FIRE_NEPAL_BRAND.name,
      title,
      description,
      images: [
        {
          url: `${FIRE_NEPAL_CANONICAL_ORIGIN}/logo.png`,
          width: 512,
          height: 512,
          alt: "Financial Freedom Nepal — FIRE Nepal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${FIRE_NEPAL_CANONICAL_ORIGIN}/logo.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function buildFinancialFreedomJsonLd() {
  const origin = FIRE_NEPAL_CANONICAL_ORIGIN;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${FINANCIAL_FREEDOM_CANONICAL}#webpage`,
      url: FINANCIAL_FREEDOM_CANONICAL,
      name: FINANCIAL_FREEDOM_TITLE,
      description: FINANCIAL_FREEDOM_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${origin}/#website` },
      about: [
        { "@type": "Thing", name: "Financial Freedom Nepal" },
        { "@type": "Thing", name: "Financial Independence Nepal" },
        { "@type": "Thing", name: "FIRE Nepal" },
        { "@type": "Thing", name: "Retirement planning Nepal" },
      ],
      dateModified: FINANCIAL_FREEDOM_LAST_UPDATED,
      author: {
        "@type": "Organization",
        name: FIRE_NEPAL_BRAND.name,
        url: origin,
      },
      reviewedBy: {
        "@type": "Person",
        name: FIRE_NEPAL_FOUNDER.name,
        jobTitle: FIRE_NEPAL_FOUNDER.jobTitle,
      },
      breadcrumb: { "@id": `${FINANCIAL_FREEDOM_CANONICAL}#breadcrumb` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${FINANCIAL_FREEDOM_CANONICAL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        {
          "@type": "ListItem",
          position: 2,
          name: "Financial Freedom Nepal",
          item: FINANCIAL_FREEDOM_CANONICAL,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${FINANCIAL_FREEDOM_CANONICAL}#faq`,
      mainEntity: FINANCIAL_FREEDOM_FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];
}
