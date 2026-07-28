import { NextResponse } from "next/server";
import { getSmartNepalDayInfo, getNepalDateKey } from "@/lib/smart-nepal-info";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";

async function GETHandler() {
  const dayInfo = getSmartNepalDayInfo();
  const dateKey = getNepalDateKey();

  return NextResponse.json(dayInfo, {
    headers: {
      "Cache-Control": `public, s-maxage=86400, stale-while-revalidate=3600`,
      "X-Smart-Nepal-Date-Key": dateKey,
    },
  });
}

export const GET = withApiRouteTiming("smart-nepal-info:GET", GETHandler);
