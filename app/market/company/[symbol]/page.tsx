import type { Metadata } from "next";
import { NepseCompanyPage } from "@/components/market/NepseCompanyPage";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = decodeURIComponent(symbol).toUpperCase();
  return {
    title: `${normalized} Analysis | FIRE Nepal NEPSE Hub`,
    description: `${normalized} company overview, live price & chart, key metrics, financials, dividends, corporate actions, shareholding, news and AI analysis.`,
  };
}

export default async function CompanyRoute({ params }: Props) {
  const { symbol } = await params;
  return <NepseCompanyPage symbol={symbol} />;
}
