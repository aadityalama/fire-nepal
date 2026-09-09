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
  const { indexOverrides, listOverridesForSymbol } = await import("@/services/market/nepse-hub-admin-overrides");
  const overrideIndex = indexOverrides(await listOverridesForSymbol(symbol));
  if (overrideIndex.size) {
    const fullPayload = overrideIndex.get("ai|_|payload");
    if (fullPayload && typeof fullPayload === "object") {
      payload = { ...payload, ...(fullPayload as typeof payload), symbol, loadedAt: new Date().toISOString() };
    }

    const asString = (key: string) => {
      const value = overrideIndex.get(`ai|_|${key}`);
      return typeof value === "string" ? value : null;
    };
    const asNumber = (key: string) => {
      const value = overrideIndex.get(`ai|_|${key}`);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    };

    const summary = asString("summary") ?? asString("investmentThesis");
    const outlook = asString("outlook");
    const riskNote = asString("riskNote") ?? asString("risk");
    const bullCase = asString("bullCase") ?? asString("pros");
    const bearCase = asString("bearCase") ?? asString("cons");
    const targetPrice = asNumber("targetPrice");

    if (summary) {
      payload = {
        ...payload,
        summary: { ...payload.summary, overall: summary },
      };
    }
    if (outlook) {
      payload = {
        ...payload,
        summary: { ...payload.summary, growthOutlook: outlook },
      };
    }
    if (riskNote) {
      payload = {
        ...payload,
        risk: { ...payload.risk, detail: riskNote },
      };
    }
    if (bullCase || bearCase) {
      const rationale = [...payload.recommendation.rationale];
      if (bullCase) rationale.unshift(`Bull case: ${bullCase}`);
      if (bearCase) rationale.unshift(`Bear case: ${bearCase}`);
      payload = {
        ...payload,
        recommendation: { ...payload.recommendation, rationale: rationale.slice(0, 10) },
      };
    }
    if (targetPrice != null) {
      payload = {
        ...payload,
        fairValue: {
          ...payload.fairValue,
          fairValueNpr: targetPrice,
          detail: payload.fairValue.detail || "Admin target price override",
        },
      };
    }
  }

  return payload;
}
