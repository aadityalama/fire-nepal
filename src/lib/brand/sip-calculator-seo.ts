import type { Metadata } from "next";
import {
  FIRE_NEPAL_BRAND,
  FIRE_NEPAL_CANONICAL_ORIGIN,
  FIRE_NEPAL_FOUNDER,
  buildCanonicalAlternates,
} from "@/lib/brand/site-seo";

export const SIP_CALCULATOR_PATH = "/sip-calculator" as const;
export const SIP_CALCULATOR_CANONICAL = `${FIRE_NEPAL_CANONICAL_ORIGIN}${SIP_CALCULATOR_PATH}`;

export const SIP_CALCULATOR_TITLE =
  "SIP Calculator Nepal 2026 – Calculate SIP Returns | FIRE Nepal";

export const SIP_CALCULATOR_DESCRIPTION =
  "Free SIP Calculator Nepal to estimate mutual fund SIP returns, total investment, maturity value, and wealth growth. Plan your monthly SIP investment in NPR with FIRE Nepal.";

export const SIP_CALCULATOR_KEYWORDS = [
  "SIP Calculator Nepal",
  "SIP calculator in Nepal",
  "SIP return calculator Nepal",
  "Nepal SIP calculator",
  "SIP investment calculator Nepal",
  "Mutual fund SIP calculator Nepal",
  "SIP calculator Nepal 2026",
  "SIP calculator NPR",
  "step-up SIP calculator Nepal",
] as const;

export const SIP_CALCULATOR_LAST_UPDATED = "2026-08-23";

export const SIP_FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What is a SIP calculator in Nepal?",
    answer:
      "A SIP calculator in Nepal estimates the future value of a Systematic Investment Plan using your monthly NPR investment, expected annual return, investment period, and optional annual step-up. It is an educational planning tool — not a guarantee of mutual fund returns.",
  },
  {
    question: "How is SIP return calculated?",
    answer:
      "FIRE Nepal’s SIP Calculator compounds monthly contributions using an assumed annual return converted to a monthly rate. With optional step-up, the monthly SIP amount increases each year. The result is an illustrative maturity value based on your assumptions, not a promised fund return.",
  },
  {
    question: "What is the minimum SIP investment in Nepal?",
    answer:
      "Minimum SIP amounts vary by mutual fund scheme and distributor. Many Nepal schemes historically allow starting around Rs 500–1,000 per month, but you should confirm the current minimum with the specific fund house before investing.",
  },
  {
    question: "Can I calculate SIP returns in Nepali Rupees?",
    answer:
      "Yes. The FIRE Nepal SIP Calculator is built for NPR planning, with results formatted using Nepalese/Indian digit grouping so you can review total invested, estimated maturity value, and wealth gain in rupees.",
  },
  {
    question: "What happens if I increase my SIP every year?",
    answer:
      "An annual step-up increases your monthly contribution each year (for example by 5% or 10%). Over long periods this can raise total invested and estimated maturity value substantially because larger later contributions also compound. Use the step-up field on the calculator to model this.",
  },
  {
    question: "Is SIP return guaranteed?",
    answer:
      "No. SIP returns in mutual funds are market-linked and not guaranteed. Calculator outputs are illustrative estimates based on the return rate you enter. Actual results can be higher or lower depending on NAV movement, fees, taxes, and how long you stay invested.",
  },
  {
    question: "Which mutual funds offer SIP in Nepal?",
    answer:
      "Several SEBON-regulated mutual fund schemes and capital companies in Nepal offer SIP or systematic investment options. Availability, minimum amounts, and payment methods change over time — check the fund’s key information memorandum and the issuer’s current SIP process.",
  },
  {
    question: "How much should I invest in SIP every month?",
    answer:
      "There is no single correct amount. A practical approach is to invest only what you can sustain after essentials, emergency savings, and debt obligations. Compare scenarios such as Rs 1,000, Rs 5,000, Rs 10,000, or Rs 20,000 per month in the calculator to see how contribution size changes estimated outcomes.",
  },
  {
    question: "How does compounding work in SIP?",
    answer:
      "Each SIP installment can earn returns, and those returns can earn further returns over time. Early contributions have more months to compound than later ones. Longer horizons usually amplify compounding — but markets can also reverse gains, so compounding is a mathematical effect under assumed returns, not a guarantee.",
  },
  {
    question: "What is the difference between SIP and lumpsum investment?",
    answer:
      "SIP invests fixed amounts periodically (usually monthly). Lumpsum invests a large amount at once. SIP can be easier to fund from salary or remittance cash flow and spreads purchase timing; lumpsum puts more capital to work sooner if you already hold cash. Neither approach guarantees better results.",
  },
];

export function buildSipCalculatorMetadata(): Metadata {
  const title = SIP_CALCULATOR_TITLE;
  const description = SIP_CALCULATOR_DESCRIPTION;
  const url = SIP_CALCULATOR_CANONICAL;

  return {
    title: { absolute: title },
    description,
    keywords: [...SIP_CALCULATOR_KEYWORDS],
    authors: [{ name: FIRE_NEPAL_BRAND.name, url: FIRE_NEPAL_CANONICAL_ORIGIN }],
    creator: FIRE_NEPAL_BRAND.name,
    publisher: FIRE_NEPAL_BRAND.name,
    category: "finance",
    alternates: buildCanonicalAlternates(SIP_CALCULATOR_PATH),
    openGraph: {
      type: "website",
      locale: "en_US",
      alternateLocale: ["ne_NP"],
      url,
      siteName: FIRE_NEPAL_BRAND.name,
      title,
      description,
      images: [
        {
          url: `${FIRE_NEPAL_CANONICAL_ORIGIN}/logo.png`,
          width: 512,
          height: 512,
          alt: "SIP Calculator Nepal — FIRE Nepal",
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

export function buildSipCalculatorJsonLd() {
  const origin = FIRE_NEPAL_CANONICAL_ORIGIN;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SIP_CALCULATOR_CANONICAL}#webpage`,
      url: SIP_CALCULATOR_CANONICAL,
      name: SIP_CALCULATOR_TITLE,
      description: SIP_CALCULATOR_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${origin}/#website` },
      about: [
        { "@type": "Thing", name: "Systematic Investment Plan" },
        { "@type": "Thing", name: "SIP Calculator Nepal" },
        { "@type": "Thing", name: "Mutual fund investing in Nepal" },
      ],
      dateModified: SIP_CALCULATOR_LAST_UPDATED,
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
      breadcrumb: { "@id": `${SIP_CALCULATOR_CANONICAL}#breadcrumb` },
      mainEntity: { "@id": `${SIP_CALCULATOR_CANONICAL}#webapplication` },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": `${SIP_CALCULATOR_CANONICAL}#webapplication`,
      name: "SIP Calculator Nepal",
      alternateName: ["Nepal SIP Calculator", "SIP Return Calculator Nepal"],
      url: SIP_CALCULATOR_CANONICAL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      description: SIP_CALCULATOR_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "NPR",
      },
      featureList: [
        "Monthly SIP amount in NPR",
        "Expected annual return",
        "Investment duration",
        "Annual step-up percentage",
        "Total invested and estimated maturity value",
        "Year-by-year breakdown",
        "Growth chart",
      ],
      provider: {
        "@type": "Organization",
        name: FIRE_NEPAL_BRAND.name,
        url: origin,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${SIP_CALCULATOR_CANONICAL}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "SIP Calculator Nepal",
          item: SIP_CALCULATOR_CANONICAL,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${SIP_CALCULATOR_CANONICAL}#faq`,
      mainEntity: SIP_FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];
}
