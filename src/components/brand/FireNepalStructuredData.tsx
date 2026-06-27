import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/brand/site-seo";

export function FireNepalStructuredData() {
  const payload = [buildOrganizationJsonLd(), buildWebSiteJsonLd(), buildSoftwareApplicationJsonLd()];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
