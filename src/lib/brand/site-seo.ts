import type { Metadata } from "next";

export const FIRE_NEPAL_BRAND = {
  name: "FIRE Nepal",
  tagline: "Financial Independence for Nepalis Abroad",
  platformLine: "Financial Platform for Nepalis Worldwide",
  audienceLine: "Built for Nepalis living, working and studying abroad.",
  description:
    "FIRE Nepal is the all-in-one financial platform for Nepalis worldwide. Achieve Financial Independence, Retire Early (FIRE) and confidently plan your return to Nepal.",
  keywords: [
    "FIRE Nepal",
    "Nepalis abroad",
    "financial independence",
    "Nepal return planning",
    "remittance",
    "NPR",
    "FIRE calculator",
    "diaspora finance",
  ],
} as const;

const HOMEPAGE_CANONICAL_URL = "https://www.firenepal.com";
const HOMEPAGE_TITLE = "FIRE Nepal | Financial Independence, Retire Early for Nepalis Worldwide";
export const FIRE_NEPAL_THEME_COLOR = "#059669";
const STRUCTURED_DATA_DESCRIPTION =
  "FIRE Nepal is the all-in-one financial platform for Nepalis worldwide, helping users achieve Financial Independence, Retire Early (FIRE) and confidently plan their return to Nepal.";
const WEB_APPLICATION_DESCRIPTION =
  "FIRE Nepal is the all-in-one financial platform for Nepalis worldwide helping users achieve Financial Independence, Retire Early (FIRE).";
const FIRE_NEPAL_CORE_FEATURES = [
  "Financial Independence (FIRE)",
  "Expense Tracking",
  "Budget Management",
  "Savings Tracking",
  "Net Worth Tracking",
  "Portfolio Tracking",
  "Wealth Analytics",
  "FIRE Progress Tracking",
  "Nepal Return Planning",
  "Remittance Management",
  "FIRE Biz",
  "Family Hub",
  "Child Education Tracker",
] as const;

export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://firenepal.com";
}

export function buildRootMetadata(): Metadata {
  const origin = getSiteOrigin();
  const title = `${FIRE_NEPAL_BRAND.name} | ${FIRE_NEPAL_BRAND.tagline}`;
  const description = FIRE_NEPAL_BRAND.description;

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: `%s | ${FIRE_NEPAL_BRAND.name}`,
    },
    description,
    keywords: [...FIRE_NEPAL_BRAND.keywords],
    applicationName: FIRE_NEPAL_BRAND.name,
    authors: [{ name: FIRE_NEPAL_BRAND.name, url: origin }],
    creator: FIRE_NEPAL_BRAND.name,
    publisher: FIRE_NEPAL_BRAND.name,
    category: "finance",
    icons: buildSiteIcons(),
    manifest: "/site.webmanifest",
    openGraph: buildOpenGraphTags({ origin, title, description }),
    twitter: buildTwitterTags({ title, description, origin }),
    robots: {
      index: true,
      follow: true,
    },
  };
}

function buildSiteIcons(): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

function buildOpenGraphTags({
  origin,
  title,
  description,
  path = "",
}: {
  origin: string;
  title: string;
  description: string;
  path?: string;
}) {
  return {
    type: "website" as const,
    locale: "en_US",
    alternateLocale: ["ne_NP", "ko_KR", "ja_JP"],
    url: `${origin}${path}`,
    siteName: FIRE_NEPAL_BRAND.name,
    title,
    description,
    images: [
      {
        url: `${origin}/logo.png`,
        width: 512,
        height: 512,
        alt: `${FIRE_NEPAL_BRAND.name} — ${FIRE_NEPAL_BRAND.platformLine}`,
      },
    ],
  };
}

function buildTwitterTags({
  title,
  description,
  origin,
}: {
  title: string;
  description: string;
  origin: string;
}) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [`${origin}/logo.png`],
  };
}

/** Homepage-only metadata — explicit title, description, OG and Twitter (no layout template suffix). */
export function buildHomepageMetadata(): Metadata {
  const origin = HOMEPAGE_CANONICAL_URL;
  const title = HOMEPAGE_TITLE;
  const description = FIRE_NEPAL_BRAND.description;

  return {
    metadataBase: new URL(origin),
    title: {
      absolute: title,
    },
    description,
    keywords: [...FIRE_NEPAL_BRAND.keywords],
    alternates: {
      canonical: origin,
    },
    openGraph: buildOpenGraphTags({ origin, title, description }),
    twitter: buildTwitterTags({ title, description, origin }),
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
    appleWebApp: {
      capable: true,
      title: FIRE_NEPAL_BRAND.name,
      statusBarStyle: "default",
    },
    other: {
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export function buildOrganizationJsonLd() {
  const origin = HOMEPAGE_CANONICAL_URL;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: FIRE_NEPAL_BRAND.name,
    url: origin,
    logo: `${origin}/logo.png`,
    description: STRUCTURED_DATA_DESCRIPTION,
    slogan: FIRE_NEPAL_BRAND.platformLine,
    areaServed: "Worldwide",
    audience: {
      "@type": "Audience",
      audienceType: "Nepalis Worldwide",
    },
  };
}

export function buildWebSiteJsonLd() {
  const origin = HOMEPAGE_CANONICAL_URL;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: FIRE_NEPAL_BRAND.name,
    alternateName: "FIRE Nepal App",
    url: origin,
    inLanguage: ["en", "ne", "ko", "ja"],
    publisher: {
      "@id": `${origin}/#organization`,
    },
  };
}

export function buildSoftwareApplicationJsonLd() {
  const origin = HOMEPAGE_CANONICAL_URL;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${origin}/#webapplication`,
    name: FIRE_NEPAL_BRAND.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: origin,
    description: WEB_APPLICATION_DESCRIPTION,
    featureList: [...FIRE_NEPAL_CORE_FEATURES],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Nepalis Worldwide",
    },
    publisher: {
      "@id": `${origin}/#organization`,
    },
  };
}

export function buildFaqPageJsonLd() {
  const origin = HOMEPAGE_CANONICAL_URL;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${origin}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "What is FIRE Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FIRE Nepal is an all-in-one financial platform for Nepalis worldwide to plan wealth, FIRE progress, and a confident return to Nepal.",
        },
      },
      {
        "@type": "Question",
        name: "Who is FIRE Nepal for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FIRE Nepal is for Nepalis living in Nepal or abroad who want to manage money, track wealth, and plan long-term financial freedom.",
        },
      },
      {
        "@type": "Question",
        name: "What is Financial Independence, Retire Early (FIRE)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FIRE is a financial strategy focused on building enough assets and passive income to gain freedom from mandatory work earlier in life.",
        },
      },
      {
        "@type": "Question",
        name: "How does FIRE Nepal help users plan their return to Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FIRE Nepal helps users model savings, net worth, expenses, remittance, and Nepal return readiness in one financial workspace.",
        },
      },
      {
        "@type": "Question",
        name: "What financial tools are available inside FIRE Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FIRE Nepal includes tools for FIRE planning, expense tracking, budgeting, savings, portfolio tracking, wealth analytics, remittance, FIRE Biz, Family Hub, and child education planning.",
        },
      },
    ],
  };
}
