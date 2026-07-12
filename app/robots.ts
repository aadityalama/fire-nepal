import type { MetadataRoute } from "next";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/account/",
          "/dashboard/",
          "/onboarding/",
          "/portfolio/",
          "/family/",
          "/children/",
          "/education/",
          "/health/",
          "/family-calendar/",
          "/parenting-ai/",
          "/family-ai-insights/",
          "/family-settings/",
          "/child-records-vault/",
          "/fire-biz/",
          "/fire-ai/",
          "/hub/",
          "/more/",
        ],
      },
    ],
    sitemap: `${FIRE_NEPAL_CANONICAL_ORIGIN}/sitemap.xml`,
    host: FIRE_NEPAL_CANONICAL_ORIGIN,
  };
}
