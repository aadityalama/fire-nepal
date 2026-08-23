import type { Metadata } from "next";
import { CurrencyConverterDashboard } from "@/components/CurrencyConverterDashboard";
import { FinancialFreedomRelatedLink } from "@/components/financial-freedom/FinancialFreedomRelatedLink";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Live Currency Converter | FIRE Nepal",
  description:
    "Live global exchange dashboard for Nepali workers abroad. Convert KRW, NPR, USD, EUR, JPY, GBP, AUD, CAD, SGD, INR, and CNY with auto-refreshing exchange rates.",
  alternates: buildCanonicalAlternates("/currency-converter"),
};

export default function CurrencyConverterPage() {
  return (
    <>
      <CurrencyConverterDashboard />
      <div className="bg-[#f4fbf6] px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <FinancialFreedomRelatedLink
            anchor="financial freedom for Nepalis abroad"
            note="Use FX clarity inside a full earn → remit → invest independence plan."
          />
        </div>
      </div>
    </>
  );
}
