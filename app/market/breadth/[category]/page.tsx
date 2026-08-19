import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NepseBreadthListPage } from "@/components/market/NepseBreadthListPage";
import { getBreadthCategoryMeta, isNepseBreadthCategory } from "@/lib/market/nepse-breadth";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) {
    return {
      title: "NEPSE Hub | FIRE Nepal",
      description: "We are working on it. Premium NEPSE Hub is temporarily unavailable.",
    };
  }
  const { category } = await params;
  if (!isNepseBreadthCategory(category)) return {};
  const meta = getBreadthCategoryMeta(category);
  return {
    title: `${meta.label} | FIRE Nepal NEPSE Hub`,
    description: `${meta.description} with live NEPSE market data in FIRE Nepal.`,
  };
}

export default async function NepseBreadthRoute({ params }: Props) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  const { category } = await params;
  if (!isNepseBreadthCategory(category)) notFound();
  return <NepseBreadthListPage category={category} />;
}
