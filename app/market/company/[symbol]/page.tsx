import type { Metadata } from "next";
import { NepseCompanyPage } from "@/components/market/NepseCompanyPage";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) {
    return {
      title: "NEPSE Hub | FIRE Nepal",
      description: "We are working on it. Premium NEPSE Hub is temporarily unavailable.",
    };
  }
  const { symbol } = await params;
  const normalized = decodeURIComponent(symbol).toUpperCase();
  return {
    title: `${normalized} Analysis | FIRE Nepal NEPSE Hub`,
    description: `${normalized} company overview, live price & chart, key metrics, financials, dividends, corporate actions, shareholding, news and AI analysis.`,
  };
}

export default async function CompanyRoute({ params }: Props) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  const { symbol } = await params;
  return <NepseCompanyPage symbol={symbol} />;
}
