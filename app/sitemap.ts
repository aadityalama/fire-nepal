import type { MetadataRoute } from "next";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import { getAllFinancialFreedomGuideSlugs } from "@/data/financial-freedom-guides/articles";
import { getAllSipGuideSlugs } from "@/data/sip-guides/articles";

type SitemapEntry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const PUBLIC_SITEMAP_ROUTES: SitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/financial-freedom-nepal", changeFrequency: "weekly", priority: 0.98 },
  { path: "/about", changeFrequency: "monthly", priority: 0.75 },
  { path: "/founder", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/security", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/learn/fire-lifestyle", changeFrequency: "monthly", priority: 0.7 },
  { path: "/learn/nepal-economy", changeFrequency: "weekly", priority: 0.7 },
  { path: "/learn/sip", changeFrequency: "weekly", priority: 0.85 },
  { path: "/learn/financial-freedom", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/nepal-cost-of-living", changeFrequency: "monthly", priority: 0.7 },
  { path: "/return-to-nepal", changeFrequency: "monthly", priority: 0.8 },
  { path: "/fire-summary", changeFrequency: "monthly", priority: 0.8 },
  { path: "/cashflow-dashboard", changeFrequency: "monthly", priority: 0.7 },
  { path: "/expense-dashboard", changeFrequency: "monthly", priority: 0.7 },
  { path: "/savings-tracker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/emergency-fund", changeFrequency: "monthly", priority: 0.7 },
  { path: "/sip-calculator", changeFrequency: "weekly", priority: 0.95 },
  { path: "/swp-calculator", changeFrequency: "monthly", priority: 0.75 },
  { path: "/lumpsum-calculator", changeFrequency: "monthly", priority: 0.7 },
  { path: "/inflation-calculator", changeFrequency: "monthly", priority: 0.6 },
  { path: "/currency-converter", changeFrequency: "weekly", priority: 0.7 },
  { path: "/global-financial-intelligence", changeFrequency: "monthly", priority: 0.6 },
  { path: "/insurance", changeFrequency: "monthly", priority: 0.6 },
  { path: "/smart-loan-os", changeFrequency: "monthly", priority: 0.6 },
  { path: "/smart-reminders", changeFrequency: "monthly", priority: 0.6 },
  { path: "/korea-pension-dashboard", changeFrequency: "monthly", priority: 0.65 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const sipGuides: MetadataRoute.Sitemap = getAllSipGuideSlugs().map((slug) => ({
    url: `${FIRE_NEPAL_CANONICAL_ORIGIN}/learn/sip/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const freedomGuides: MetadataRoute.Sitemap = getAllFinancialFreedomGuideSlugs().map((slug) => ({
    url: `${FIRE_NEPAL_CANONICAL_ORIGIN}/learn/financial-freedom/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const staticRoutes = PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? FIRE_NEPAL_CANONICAL_ORIGIN : `${FIRE_NEPAL_CANONICAL_ORIGIN}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  return [...staticRoutes, ...sipGuides, ...freedomGuides];
}
