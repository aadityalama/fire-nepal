import type { Metadata } from "next";
import { NepseCompanyPage } from "@/components/market/NepseCompanyPage";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const normalized = decodeURIComponent(symbol).toUpperCase();
  return {
    title: `${normalized} Analysis | FIRE Nepal NEPSE Hub`,
    description: `${normalized} quote, chart, technical analysis, fundamentals and market intelligence.`,
  };
}

export default async function CompanyRoute({ params }: Props) {
  const { symbol } = await params;
  return <NepseCompanyPage symbol={symbol} />;
}
