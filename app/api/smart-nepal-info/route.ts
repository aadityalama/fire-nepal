import { NextResponse } from "next/server";
import {
  getSmartNepalDayInfo,
  getNepalDateKey,
  getNepalReferenceDate,
  resolveSmartNepalDayInfoBase,
} from "@/lib/smart-nepal-info";

export const runtime = "nodejs";

function parseReferenceDate(raw: string | null): Date {
  if (!raw) {
    return new Date();
  }

  // Accept Nepal-local civil dates as YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00+05:45`);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return getNepalReferenceDate(parsed);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referenceDate = parseReferenceDate(searchParams.get("date"));
  const dateKey = getNepalDateKey(referenceDate);

  try {
    const dayInfo = await getSmartNepalDayInfo(referenceDate);
    return NextResponse.json(dayInfo, {
      headers: {
        "Cache-Control": `public, s-maxage=3600, stale-while-revalidate=3600`,
        "X-Smart-Nepal-Date-Key": dateKey,
        "X-Smart-Nepal-Festival-Source": dayInfo.festivalSource ?? "none",
      },
    });
  } catch {
    // Absolute last resort: never 500 the homepage bar if enrichment blows up.
    const fallback = resolveSmartNepalDayInfoBase(referenceDate);
    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
        "X-Smart-Nepal-Date-Key": dateKey,
        "X-Smart-Nepal-Festival-Source": "fallback",
      },
    });
  }
}
