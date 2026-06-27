import { NextResponse } from "next/server";
import { getSmartNepalDayInfo, getNepalDateKey } from "@/lib/smart-nepal-info";

export const runtime = "nodejs";

export async function GET() {
  const dayInfo = getSmartNepalDayInfo();
  const dateKey = getNepalDateKey();

  return NextResponse.json(dayInfo, {
    headers: {
      "Cache-Control": `public, s-maxage=86400, stale-while-revalidate=3600`,
      "X-Smart-Nepal-Date-Key": dateKey,
    },
  });
}
