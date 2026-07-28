import { NextResponse } from "next/server";
import { getGoldSilverNprPrice } from "@/services/market/gold-silver-npr-price";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";

async function GETHandler() {
  const body = await getGoldSilverNprPrice();
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120",
    },
  });
}

export const GET = withApiRouteTiming("market/gold-price:GET", GETHandler);
