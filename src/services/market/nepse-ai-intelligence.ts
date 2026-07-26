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

  return buildAiIntelligence({
    symbol,
    intelligence,
    technical,
    livePriceNpr,
    ohlcCloses,
  });
}
