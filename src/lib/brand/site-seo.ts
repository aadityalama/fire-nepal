import type { Metadata } from "next";

export const FIRE_NEPAL_BRAND = {
  name: "FIRE Nepal",
  tagline: "Financial Independence for Nepalis Abroad",
  platformLine: "Financial Platform for Nepalis Worldwide",
  audienceLine: "Built for Nepalis living, working and studying abroad.",
  description:
    "A premium financial platform for Nepalis worldwide — multi-currency FIRE planning, savings tracking, investment education, remittance tools, and Nepal return readiness.",
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
    openGraph: {
      type: "website",
      locale: "en_US",
      alternateLocale: ["ne_NP", "ko_KR", "ja_JP"],
      url: origin,
      siteName: FIRE_NEPAL_BRAND.name,
      title,
      description,
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: `${FIRE_NEPAL_BRAND.name} — ${FIRE_NEPAL_BRAND.platformLine}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildOrganizationJsonLd() {
  const origin = getSiteOrigin();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: FIRE_NEPAL_BRAND.name,
    url: origin,
    logo: `${origin}/logo.png`,
    description: FIRE_NEPAL_BRAND.description,
    slogan: FIRE_NEPAL_BRAND.platformLine,
    areaServed: "Worldwide",
    audience: {
      "@type": "Audience",
      audienceType: "Nepalis living, working and studying abroad",
    },
  };
}

export function buildWebSiteJsonLd() {
  const origin = getSiteOrigin();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: FIRE_NEPAL_BRAND.name,
    url: origin,
    description: FIRE_NEPAL_BRAND.description,
    inLanguage: ["en", "ne", "ko", "ja"],
    publisher: {
      "@type": "Organization",
      name: FIRE_NEPAL_BRAND.name,
      url: origin,
    },
  };
}

export function buildSoftwareApplicationJsonLd() {
  const origin = getSiteOrigin();

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: FIRE_NEPAL_BRAND.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: origin,
    description: FIRE_NEPAL_BRAND.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Nepalis abroad",
    },
  };
}
