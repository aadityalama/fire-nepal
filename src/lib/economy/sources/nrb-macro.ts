import type { EconomyFetchOutcome, EconomySourceResult } from "@/lib/economy/types";
import { fetchPdfText } from "@/lib/economy/pdf";

const NRB_APP_POSTS = "https://www.nrb.org.np/api/app/v1/posts";

type NrbAppPost = {
  post_title?: string;
  post_date?: string;
  slug?: string;
};

type NrbAppPostsResponse = {
  data?: { payload?: NrbAppPost[] };
};

export type NrbMacroSnapshot = {
  inflationYoY: number | null;
  remittanceMonthlyBillion: number | null;
  remittanceChangePct: number | null;
  depositRateCommercial: number | null;
  lendingRateCommercial: number | null;
  periodLabel: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  monthsCovered: number | null;
  rawExcerpt: string;
};

const MONTH_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function normalize(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
}

function matchNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseNrbMacroPdfText(
  text: string,
  sourceUrl: string,
  publishedAt: string | null,
): NrbMacroSnapshot {
  const body = normalize(text);

  let monthsCovered = matchNumber(body, /based on\s+(?:the\s+)?(\d+)\s+months?/i);
  const word = body.match(
    /based on\s+(?:the\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?/i,
  )?.[1];
  if (word && MONTH_WORDS[word.toLowerCase()] != null) {
    monthsCovered = MONTH_WORDS[word.toLowerCase()];
  }

  const inflationYoY =
    matchNumber(
      body,
      /y-?o-?y\s+consumer\s+price\s+inflation[^\n%]{0,120}?stood at\s+(\d+(?:\.\d+)?)\s+percent/i,
    ) ??
    matchNumber(body, /CPI-based inflation stood at\s+(\d+(?:\.\d+)?)\s+percent/i) ??
    matchNumber(body, /consumer price\s+inflation stood at\s+(\d+(?:\.\d+)?)\s+percent/i);

  const remittanceMonthlyBillion =
    matchNumber(body, /remittance inflows stood at Rs\.?\s*(\d+(?:\.\d+)?)\s+billion/i) ??
    matchNumber(
      body,
      /During mid-[^\n]{0,120}?remittance inflows stood at Rs\.?\s*(\d+(?:\.\d+)?)\s+billion/i,
    );

  const remittanceChangePct = matchNumber(
    body,
    /Remittance inflows increased\s+(\d+(?:\.\d+)?)\s+percent to Rs\.?\s*\d/i,
  );

  let depositRateCommercial = matchNumber(
    body,
    /weighted average deposit rates? of commercial banks[^\n]{0,80}?stood at\s+(\d+(?:\.\d+)?)\s+percent/i,
  );
  let lendingRateCommercial = matchNumber(
    body,
    /weighted average lending rates? of commercial banks[^\n]{0,80}?stood at\s+(\d+(?:\.\d+)?)\s+percent/i,
  );

  const depositTable = body.match(
    /Commercial banks\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i,
  );
  if (depositTable) {
    depositRateCommercial = Number(depositTable[2]);
    lendingRateCommercial = Number(depositTable[4]);
  }

  const midMonth = body.match(/mid-([A-Za-z]+)\s+(\d{4})/i);
  const periodLabel = midMonth
    ? `mid-${midMonth[1]} ${midMonth[2]}${monthsCovered ? ` · ${monthsCovered}-month CMFS` : ""}`
    : monthsCovered
      ? `NRB CMFS · ${monthsCovered} months`
      : "NRB Current Macroeconomic & Financial Situation";

  return {
    inflationYoY,
    remittanceMonthlyBillion,
    remittanceChangePct,
    depositRateCommercial:
      depositRateCommercial != null && Number.isFinite(depositRateCommercial)
        ? depositRateCommercial
        : null,
    lendingRateCommercial:
      lendingRateCommercial != null && Number.isFinite(lendingRateCommercial)
        ? lendingRateCommercial
        : null,
    periodLabel,
    publishedAt,
    sourceUrl,
    monthsCovered,
    rawExcerpt: body.slice(0, 500),
  };
}

async function listMacroPosts(): Promise<NrbAppPost[]> {
  const q = encodeURIComponent("Current Macroeconomic and Financial Situation – English");
  const url = `${NRB_APP_POSTS}?per_page=15&page=1&q=${q}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "FireNepalEconomyEngine/1.0" },
  });
  if (!res.ok) throw new Error(`NRB app posts HTTP ${res.status}`);
  const json = (await res.json()) as NrbAppPostsResponse;
  return (json.data?.payload ?? []).filter((post) => {
    const title = post.post_title ?? "";
    const slug = post.slug ?? "";
    return /english/i.test(title) && /macroeconomic|financial situation/i.test(title) && /\.pdf$/i.test(slug);
  });
}

function candidateMacroPdfUrls(): string[] {
  const words = ["eleven", "ten", "nine", "eight", "seven", "six", "five", "four", "three", "two", "one"];
  const years = ["2026-27", "2025-26"];
  const urls: string[] = [];
  for (const year of years) {
    for (const w of words) {
      const monthToken = w === "one" ? "one-month" : `${w}-months`;
      urls.push(
        `https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-${monthToken}-data-of-${year}/`,
      );
    }
  }
  return urls;
}

export async function fetchLatestNrbMacroSnapshot(): Promise<NrbMacroSnapshot> {
  try {
    const posts = await listMacroPosts();
    const latest = posts[0];
    if (latest?.slug) {
      const { text } = await fetchPdfText(latest.slug);
      return parseNrbMacroPdfText(text, latest.slug, latest.post_date ?? null);
    }
  } catch {
    // fall through
  }

  let lastError = "No NRB macro PDF found";
  for (const url of candidateMacroPdfUrls()) {
    try {
      const { text } = await fetchPdfText(url);
      return parseNrbMacroPdfText(text, url, null);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

function fromMacro(
  key: EconomySourceResult["key"],
  value: number,
  displayValue: string,
  unit: string,
  snap: NrbMacroSnapshot,
  extra?: Partial<EconomySourceResult>,
): EconomySourceResult {
  return {
    key,
    value,
    displayValue,
    unit,
    currency: key === "remittance" ? "NPR" : null,
    source: "Nepal Rastra Bank",
    sourceUrl: snap.sourceUrl,
    period: snap.periodLabel,
    publishedAt: snap.publishedAt,
    frequency: "monthly",
    valueKind: "actual",
    liveCapable: false,
    raw: {
      monthsCovered: snap.monthsCovered,
      excerpt: snap.rawExcerpt,
    },
    ...extra,
  };
}

export async function fetchNrbMacroMetrics(): Promise<EconomyFetchOutcome[]> {
  try {
    const snap = await fetchLatestNrbMacroSnapshot();
    const out: EconomyFetchOutcome[] = [];

    if (snap.inflationYoY != null) {
      out.push({
        ok: true,
        via: "primary",
        metric: fromMacro("inflation", snap.inflationYoY, `${snap.inflationYoY.toFixed(2)}%`, "%", snap, {
          changeLabel: "CPI y-o-y",
          tone: "neutral",
        }),
      });
    } else {
      out.push({
        ok: false,
        key: "inflation",
        error: "CPI inflation not found in NRB CMFS PDF",
        via: "primary",
      });
    }

    if (snap.remittanceMonthlyBillion != null) {
      const change = snap.remittanceChangePct;
      out.push({
        ok: true,
        via: "primary",
        metric: fromMacro(
          "remittance",
          snap.remittanceMonthlyBillion,
          `रु ${snap.remittanceMonthlyBillion.toLocaleString("en-US", { maximumFractionDigits: 2 })}B`,
          "NPR billion",
          snap,
          {
            change,
            changePercent: change,
            changeLabel:
              change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}% y-o-y (period)` : "Monthly inflow",
            tone: change == null ? "neutral" : change >= 0 ? "up" : "down",
          },
        ),
      });
    } else {
      out.push({
        ok: false,
        key: "remittance",
        error: "Monthly remittance not found in NRB CMFS PDF",
        via: "primary",
      });
    }

    if (snap.depositRateCommercial != null) {
      const lending = snap.lendingRateCommercial;
      out.push({
        ok: true,
        via: "primary",
        metric: fromMacro(
          "fd_rates",
          snap.depositRateCommercial,
          `${snap.depositRateCommercial.toFixed(2)}%`,
          "%",
          snap,
          {
            changeLabel:
              lending != null
                ? `NRB weighted avg deposit (lending ${lending.toFixed(2)}%)`
                : "NRB weighted average deposit rate · commercial banks",
            tone: "neutral",
            raw: {
              monthsCovered: snap.monthsCovered,
              lendingRateCommercial: lending,
              note: "NRB weighted average deposit rate (commercial banks), not an advertised FD product range",
            },
          },
        ),
      });
    } else {
      out.push({
        ok: false,
        key: "fd_rates",
        error: "Deposit rate not found in NRB CMFS PDF",
        via: "primary",
      });
    }

    return out;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      { ok: false, key: "inflation", error: message, via: "primary" },
      { ok: false, key: "remittance", error: message, via: "primary" },
      { ok: false, key: "fd_rates", error: message, via: "primary" },
    ];
  }
}
