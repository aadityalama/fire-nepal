import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { getGoldSilverNprPrice } from "@/services/market/gold-silver-npr-price";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const blocked = guardPublicApi(req, { keyPrefix: "gold-price", max: 40, botMax: 8 });
  if (blocked) return blocked;

  const body = await getGoldSilverNprPrice();
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120",
    },
  });
}
