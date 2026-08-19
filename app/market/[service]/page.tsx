import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NepseServicePage } from "@/components/market/NepseServicePage";
import { isNepseServiceSlug, NEPSE_SERVICE_ITEMS } from "@/lib/market/nepse-hub";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

type Props = { params: Promise<{ service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) {
    return {
      title: "NEPSE Hub | FIRE Nepal",
      description: "We are working on it. Premium NEPSE Hub is temporarily unavailable.",
    };
  }
  const { service } = await params;
  const item = NEPSE_SERVICE_ITEMS.find((candidate) => candidate.slug === service);
  if (!item) return {};
  return {
    title: `${item.label} | FIRE Nepal NEPSE Hub`,
    description: `${item.description} with normalized live NEPSE market data in FIRE Nepal.`,
  };
}

export default async function MarketServiceRoute({ params }: Props) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  const { service } = await params;
  if (!isNepseServiceSlug(service)) notFound();
  return <NepseServicePage slug={service} />;
}
