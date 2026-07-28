import { authenticateNepsePublicApi } from "../src/services/market/nepse-ownership-provider.ts";
import { validateOfficialIndexSnapshot } from "../src/services/market/nepse-official-index-validation.ts";
import { fetchNepseOfficialBundle } from "../src/services/market/nepse-official-live.ts";

const ROOT = "https://www.nepalstock.com.np";

async function fetchOfficialRaw() {
  const { authorization } = await authenticateNepsePublicApi();
  const res = await fetch(`${ROOT}/api/nots/nepse-index`, {
    headers: {
      authorization,
      accept: "application/json",
      "user-agent": "FIRENepal-Verify/1.0",
      referer: `${ROOT}/`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return (rows as any[]).find((r) => r.index === "NEPSE Index" || r.id === 58);
}

async function main() {
  const raw = await fetchOfficialRaw();
  console.log("Official raw NEPSE Index:", {
    currentValue: raw.currentValue,
    close: raw.close,
    previousClose: raw.previousClose,
    change: raw.change,
    perChange: raw.perChange,
    generatedTime: raw.generatedTime,
  });

  const validated = validateOfficialIndexSnapshot({
    name: "NEPSE Index",
    currentValue: Number(raw.currentValue),
    close: Number(raw.close),
    previousClose: Number(raw.previousClose),
    change: Number(raw.change),
    perChange: Number(raw.perChange),
    high: Number(raw.high),
    low: Number(raw.low),
    generatedTime: String(raw.generatedTime ?? ""),
  });

  const bundle = await fetchNepseOfficialBundle();
  const idx = bundle.index!;

  console.log("\nFIRE atomic snapshot:", {
    index: idx.value,
    change: idx.changeNpr,
    pct: idx.changePct,
    previousClose: idx.previousClose,
    statusOpen: bundle.marketStatus.isOpen,
    asOf: bundle.marketStatus.checkedAt,
    turnover: bundle.summaryStats.totalTurnoverNpr,
    volume: bundle.summaryStats.totalVolume,
    trades: bundle.summaryStats.totalTrades,
    snapshotId: bundle.syncMeta.snapshotId,
  });

  const errs: string[] = [];
  if (idx.value !== validated.currentIndex) errs.push("bundle index != validated currentValue");
  if (idx.changeNpr !== validated.pointChange) errs.push("bundle change mismatch");
  if (idx.changePct !== validated.percentageChange) errs.push("bundle pct mismatch");
  if (Math.abs(idx.value - Number(raw.currentValue)) > 0.001) errs.push("not using official currentValue");
  if (
    Math.abs(idx.value - Number(raw.close)) < 0.001 &&
    Math.abs(Number(raw.currentValue) - Number(raw.close)) > 0.05
  ) {
    errs.push("BUG: displaying close instead of currentValue");
  }
  if (Math.abs((idx.previousClose ?? 0) + (idx.changeNpr ?? 0) - idx.value) > 0.05) {
    errs.push("identity previous+change!=current failed");
  }
  console.log("\nWebsite expected (from report): Index=2696.67 Change=-4.64 Change%=-0.17%");
  console.log("Official API currentValue:", raw.currentValue, "change:", raw.change, "perChange:", raw.perChange);
  if (errs.length) {
    console.error("\nVERIFY FAILED:", errs);
    process.exit(1);
  }
  console.log("\nVERIFY OK — atomic snapshot matches official currentValue/change/perChange");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
