import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NepseBreadthListPage } from "@/components/market/NepseBreadthListPage";
import { getBreadthCategoryMeta, isNepseBreadthCategory } from "@/lib/market/nepse-breadth";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!isNepseBreadthCategory(category)) return {};
  const meta = getBreadthCategoryMeta(category);
  return {
    title: `${meta.label} | FIRE Nepal NEPSE Hub`,
    description: `${meta.description} with live NEPSE market data in FIRE Nepal.`,
  };
}

export default async function NepseBreadthRoute({ params }: Props) {
  const { category } = await params;
  if (!isNepseBreadthCategory(category)) notFound();
  return <NepseBreadthListPage category={category} />;
}
