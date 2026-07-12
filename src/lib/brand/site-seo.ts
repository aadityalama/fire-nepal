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
  const origin = getSiteOrigin();
  const title = `${FIRE_NEPAL_BRAND.name} | ${FIRE_NEPAL_BRAND.tagline}`;
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
