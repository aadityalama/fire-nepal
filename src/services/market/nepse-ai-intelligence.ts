import { buildAiIntelligence } from "@/lib/market/nepse-ai-intelligence";
import { buildTechnicalAnalysis } from "@/lib/market/nepse-technical-summary";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { loadCompanyOhlc } from "@/services/market/nepse-company-ohlc";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";
import type { NepseAiIntelligencePayload } from "@/types/market/nepse-ai-intelligence";

/**
 * Assemble AI Company Intelligence from real FI + EOD + live quote inputs.
 * Deterministic — never calls an LLM and never invents missing fundamentals.
 */
export async function loadAiCompanyIntelligence(symbolRaw: string): Promise<NepseAiIntelligencePayload> {
  const symbol = decodeURIComponent(symbolRaw).trim().toUpperCase();

  const [intelligence, ohlc, bundle] = await Promise.all([
    loadFinancialIntelligence(symbol),
    loadCompanyOhlc(symbol, 400),
    getCachedNepseYonepseBundle().catch(() => null),
  ]);

  const tick = bundle?.bySymbol[symbol];
  const livePriceNpr =
    tick && tick.ltpNpr > 0
      ? tick.ltpNpr
      : tick?.previousCloseNpr && tick.previousCloseNpr > 0
        ? tick.previousCloseNpr
        : ohlc.bars.length
          ? ohlc.bars[ohlc.bars.length - 1].close
          : null;

  const candles = ohlc.bars.map((bar) => ({
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
  const technical = buildTechnicalAnalysis(candles);
  const ohlcCloses = candles.map((c) => c.close);

  let payload = buildAiIntelligence({
    symbol,
    intelligence,
    technical,
    livePriceNpr,
    ohlcCloses,
  });

  // Field-level AI overrides from NEPSE Hub Admin (never invent; only apply explicit edits).
  const { applyFieldOverrides, indexOverrides, listOverridesForSymbol } = await import(
    "@/services/market/nepse-hub-admin-overrides"
  );
  const overrideIndex = indexOverrides(await listOverridesForSymbol(symbol));
  if (overrideIndex.size) {
    const fullPayload = overrideIndex.get("ai|_|payload");
    if (fullPayload && typeof fullPayload === "object") {
      payload = { ...payload, ...(fullPayload as typeof payload), symbol, loadedAt: new Date().toISOString() };
    }
    const summaryPatch: Record<string, unknown> = {};
    for (const key of ["summary", "outlook", "riskNote", "bullCase", "bearCase"] as const) {
      const value = overrideIndex.get(`ai|_|${key}`);
      if (typeof value === "string") summaryPatch[key] = value;
    }
    if (typeof summaryPatch.summary === "string") {
      payload = {
        ...payload,
        summary: { ...payload.summary, overall: summaryPatch.summary as string },
      };
    }
    if (typeof summaryPatch.outlook === "string") {
      payload = {
        ...payload,
        summary: { ...payload.summary, growthOutlook: summaryPatch.outlook as string },
      };
    }
    if (typeof summaryPatch.riskNote === "string") {
      payload = {
        ...payload,
        risk: { ...payload.risk, detail: summaryPatch.riskNote as string },
      };
    }
    if (typeof summaryPatch.bullCase === "string" || typeof summaryPatch.bearCase === "string") {
      const rationale = [...payload.recommendation.rationale];
      if (typeof summaryPatch.bullCase === "string") rationale.unshift(`Bull case: ${summaryPatch.bullCase}`);
      if (typeof summaryPatch.bearCase === "string") rationale.unshift(`Bear case: ${summaryPatch.bearCase}`);
      payload = {
        ...payload,
        recommendation: { ...payload.recommendation, rationale: rationale.slice(0, 10) },
      };
    }
    payload = applyFieldOverrides({ ...payload } as Record<string, unknown>, overrideIndex, "ai") as typeof payload;
  }

  return payload;
}
