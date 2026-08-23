import { fetchJson } from "@/lib/api/fetch-json";
import type { EconomyFetchOutcome } from "@/lib/economy/types";

const WORLD_BANK_GDP_URL =
  "https://api.worldbank.org/v2/country/NPL/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=20";

type WorldBankRow = { date?: string; value?: number | null };

/**
 * Annual real GDP growth from World Bank Open Data.
 * Always labeled as annual (never "live").
 */
export async function fetchWorldBankGdp(): Promise<EconomyFetchOutcome> {
  try {
    const response = await fetchJson<[unknown, WorldBankRow[]]>(WORLD_BANK_GDP_URL, {
      timeoutMs: 15_000,
      retries: 1,
      init: { cache: "no-store" },
    });
    const rows = (response[1] ?? [])
      .filter((row) => typeof row.value === "number" && Number.isFinite(row.value) && row.date)
      .sort((a, b) => Number(a.date) - Number(b.date));
    const latest = rows.at(-1);
    if (!latest || latest.value == null || !latest.date) {
      return { ok: false, key: "gdp", error: "World Bank GDP series empty", via: "primary" };
    }

    const previous = rows.at(-2);
    const change = previous?.value != null ? latest.value - previous.value : null;

    return {
      ok: true,
      via: "primary",
      metric: {
        key: "gdp",
        value: latest.value,
        displayValue: `${latest.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`,
        unit: "%",
        currency: null,
        source: "World Bank Open Data",
        sourceUrl: WORLD_BANK_GDP_URL,
        period: `Calendar year ${latest.date}`,
        publishedAt: `${latest.date}-12-31`,
        frequency: "annual",
        valueKind: "actual",
        liveCapable: false,
        change,
        changePercent: null,
        changeLabel:
          change == null
            ? "Annual series"
            : `${change >= 0 ? "+" : ""}${change.toFixed(2)} pts vs prior year`,
        tone: latest.value >= 0 ? "up" : "down",
        raw: {
          year: latest.date,
          previousYear: previous?.date ?? null,
          previousValue: previous?.value ?? null,
          series: rows.slice(-8).map((r) => ({ year: r.date, value: r.value })),
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      key: "gdp",
      via: "primary",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
