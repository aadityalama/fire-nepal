import { NextResponse } from "next/server";
import { getGoldSilverNprPrice } from "@/services/market/gold-silver-npr-price";

export const runtime = "nodejs";

export async function GET() {
  const body = await getGoldSilverNprPrice();
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120",
    },
  });
}
