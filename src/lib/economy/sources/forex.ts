import { fetchJson } from "@/lib/api/fetch-json";
import type { EconomyFetchOutcome } from "@/lib/economy/types";

const NRB_FOREX_URL = "https://www.nrb.org.np/api/forex/v1/rates";

type NrbForexRate = {
  currency?: { iso3?: string; ISO3?: string; unit?: number | string };
  buy?: string | number;
  sell?: string | number;
};

type NrbForexResponse = {
  data?: {
    payload?: Array<{
      date?: string;
      published_on?: string;
      rates?: NrbForexRate[];
    }>;
  };
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function dayRange(daysBack: number) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(to.getUTCDate() - daysBack);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function rateFor(rates: NrbForexRate[], code: string): number | null {
  const rate = rates.find((item) => {
    const iso = item.currency?.iso3?.toUpperCase() ?? item.currency?.ISO3?.toUpperCase() ?? "";
    return iso === code;
  });
  if (!rate) return null;
  const buy = parseNumber(rate.buy);
  const sell = parseNumber(rate.sell);
  const unit = parseNumber(rate.currency?.unit) ?? 1;
  if (buy == null && sell == null) return null;
  const avg = ((buy ?? sell ?? 0) + (sell ?? buy ?? 0)) / 2;
  return avg / Math.max(unit, 1);
}

function formatNpr(value: number, digits: number) {
  return `रु ${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Official NRB forex API — primary FX source. */
export async function fetchNrbForexMetrics(): Promise<EconomyFetchOutcome[]> {
  const { from, to } = dayRange(14);
  const endpoint = `${NRB_FOREX_URL}?page=1&per_page=20&from=${from}&to=${to}`;

  try {
    const response = await fetchJson<NrbForexResponse>(endpoint, {
      timeoutMs: 15_000,
      retries: 1,
      init: { cache: "no-store" },
    });
    const payload = response.data?.payload?.find((row) => row.rates?.length);
    if (!payload?.rates?.length) {
      return [
        { ok: false, key: "usd_npr", error: "NRB forex payload empty", via: "primary" },
        { ok: false, key: "krw_npr", error: "NRB forex payload empty", via: "primary" },
      ];
    }

    const publishedAt = payload.published_on ?? payload.date ?? null;
    const period = payload.date ?? publishedAt?.slice(0, 10) ?? null;
    const usd = rateFor(payload.rates, "USD");
    const krw = rateFor(payload.rates, "KRW");
    const out: EconomyFetchOutcome[] = [];

    if (usd != null) {
      out.push({
        ok: true,
        via: "primary",
        metric: {
          key: "usd_npr",
          value: usd,
          displayValue: formatNpr(usd, 2),
          unit: "NPR per USD",
          currency: "NPR",
          source: "Nepal Rastra Bank",
          sourceUrl: NRB_FOREX_URL,
          period,
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: { date: payload.date, published_on: payload.published_on, endpoint },
        },
      });
    } else {
      out.push({ ok: false, key: "usd_npr", error: "USD rate missing in NRB payload", via: "primary" });
    }

    if (krw != null) {
      out.push({
        ok: true,
        via: "primary",
        metric: {
          key: "krw_npr",
          value: krw,
          displayValue: formatNpr(krw, 4),
          unit: "NPR per KRW",
          currency: "NPR",
          source: "Nepal Rastra Bank",
          sourceUrl: NRB_FOREX_URL,
          period,
          publishedAt,
          frequency: "daily",
          valueKind: "actual",
          liveCapable: true,
          tone: "neutral",
          raw: { date: payload.date, published_on: payload.published_on, endpoint },
        },
      });
    } else {
      out.push({ ok: false, key: "krw_npr", error: "KRW rate missing in NRB payload", via: "primary" });
    }

    return out;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      { ok: false, key: "usd_npr", error: message, via: "primary" },
      { ok: false, key: "krw_npr", error: message, via: "primary" },
    ];
  }
}
