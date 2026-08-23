import type { Metadata } from "next";
import { FinancialFreedomNepalPage } from "@/components/financial-freedom/FinancialFreedomNepalPage";
import {
  buildFinancialFreedomJsonLd,
  buildFinancialFreedomMetadata,
} from "@/lib/brand/financial-freedom-seo";

export const metadata: Metadata = buildFinancialFreedomMetadata();

export default function FinancialFreedomNepalRoute() {
  const graphs = buildFinancialFreedomJsonLd();

  return (
    <>
      {graphs.map((graph) => (
        <script
          key={String(graph["@id"] ?? graph["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
      <FinancialFreedomNepalPage />
    </>
  );
}
