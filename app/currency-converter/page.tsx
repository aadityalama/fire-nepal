import type { Metadata } from "next";
import { CurrencyConverterDashboard } from "@/components/CurrencyConverterDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Live Currency Converter | FIRE Nepal",
  description:
    "Live global exchange dashboard for Nepali workers abroad. Convert KRW, NPR, USD, EUR, JPY, GBP, AUD, CAD, SGD, INR, and CNY with auto-refreshing exchange rates.",
  alternates: buildCanonicalAlternates("/currency-converter"),
};

export default function CurrencyConverterPage() {
  return <CurrencyConverterDashboard />;
}
