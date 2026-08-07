import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NepseIndexDetailPage } from "@/components/market/NepseIndexDetailPage";
import { getMarketIndexOption, listOfficialNepseMarketIndices } from "@/lib/market/nepse-market-indices";

type Props = { params: Promise<{ indexKey: string }> };

export function generateStaticParams() {
  return listOfficialNepseMarketIndices().map((row) => ({ indexKey: row.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { indexKey } = await params;
  const option = getMarketIndexOption(indexKey.toUpperCase());
  if (!option || option.key === "ALL_LISTED") return {};
  return {
    title: `${option.displayName} | FIRE Nepal Index Explorer`,
    description: `Official NEPSE ${option.displayName} constituents with live quotes in FIRE Nepal.`,
  };
}

export default async function MarketIndexDetailRoute({ params }: Props) {
  const { indexKey: raw } = await params;
  const indexKey = raw.trim().toUpperCase();
  const option = getMarketIndexOption(indexKey);
  if (!option || option.key === "ALL_LISTED" || option.nepseId == null) notFound();
  return <NepseIndexDetailPage indexKey={option.key} />;
}
