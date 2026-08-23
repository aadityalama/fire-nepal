import type { EconomyFetchOutcome } from "@/lib/economy/types";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";

const YONEPSE_SOURCE_URL = "https://shubhamnpk.github.io/yonepse/";

export async function fetchNepseIndexMetric(): Promise<EconomyFetchOutcome> {
  try {
    const bundle = await getCachedNepseYonepseBundle();
    const indexValue = bundle.index?.value;
    if (indexValue == null || !Number.isFinite(indexValue)) {
      return { ok: false, key: "nepse", error: "NEPSE index missing from market bundle", via: "primary" };
    }

    const changePct = bundle.index?.changePct ?? null;
    return {
      ok: true,
      via: "primary",
      metric: {
        key: "nepse",
        value: indexValue,
        displayValue: indexValue.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        unit: "index",
        currency: null,
        source: "Yonepse public NEPSE mirror",
        sourceUrl: YONEPSE_SOURCE_URL,
        period: "Latest NEPSE index",
        publishedAt: new Date().toISOString(),
        frequency: "daily",
        valueKind: "actual",
        liveCapable: true,
        change: changePct,
        changePercent: changePct,
        changeLabel:
          changePct == null
            ? null
            : `${changePct >= 0 ? "+" : ""}${changePct.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`,
        tone: changePct == null ? "neutral" : changePct >= 0 ? "up" : "down",
        raw: { changePct },
      },
    };
  } catch (error) {
    return {
      ok: false,
      key: "nepse",
      via: "primary",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
