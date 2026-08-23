import type { EconomyFetchOutcome } from "@/lib/economy/types";
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

function matchPolicyRate(text: string): number | null {
  const patterns = [
    /policy rate has been reduced from\s+\d+(?:\.\d+)?\s+percent to\s+(\d+(?:\.\d+)?)\s+percent/i,
    /policy rate has been (?:maintained|kept unchanged) at\s+(\d+(?:\.\d+)?)\s+percent/i,
    /Likewise,\s+the\s+policy rate has been reduced from\s+\d+(?:\.\d+)?\s+percent to\s+(\d+(?:\.\d+)?)\s+percent/i,
    /policy rate(?:\s+has been)?(?:\s+set)?(?:\s+at)?\s+(\d+(?:\.\d+)?)\s+percent/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (!m?.[1]) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 20) return n;
  }
  return null;
}

async function listMonetaryPolicyPdfs(): Promise<NrbAppPost[]> {
  const queries = [
    "Monetary Policy Annual Review",
    "Monetary Policy Mid-Term Review",
    "Monetary Policy (in English)",
  ];
  const seen = new Set<string>();
  const posts: NrbAppPost[] = [];
  for (const q of queries) {
    const url = `${NRB_APP_POSTS}?per_page=8&page=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "FireNepalEconomyEngine/1.0" },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as NrbAppPostsResponse;
    for (const post of json.data?.payload ?? []) {
      const slug = post.slug ?? "";
      if (!/\.pdf$/i.test(slug)) continue;
      if (!/monetary\s*policy/i.test(post.post_title ?? "") && !/monetary/i.test(slug)) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      posts.push(post);
    }
  }
  return posts;
}

const FALLBACK_POLICY_PDFS = [
  "https://www.nrb.org.np/contents/uploads/2025/08/Monetary_Policy_2082-083_English.pdf",
];

export async function fetchNrbPolicyRate(): Promise<EconomyFetchOutcome> {
  try {
    const posts = await listMonetaryPolicyPdfs();
    const candidates = [
      ...posts.map((p) => ({
        url: p.slug!,
        publishedAt: p.post_date ?? null,
        title: p.post_title ?? null,
      })),
      ...FALLBACK_POLICY_PDFS.map((url) => ({
        url,
        publishedAt: null as string | null,
        title: null as string | null,
      })),
    ];

    let lastError = "Policy rate not found in NRB monetary policy PDFs";
    for (const candidate of candidates) {
      try {
        const { text } = await fetchPdfText(candidate.url);
        const rate = matchPolicyRate(text);
        if (rate == null) {
          lastError = `No policy rate pattern in ${candidate.url}`;
          continue;
        }
        return {
          ok: true,
          via: "primary",
          metric: {
            key: "policy_rate",
            value: rate,
            displayValue: `${rate.toFixed(2)}%`,
            unit: "%",
            currency: null,
            source: "Nepal Rastra Bank",
            sourceUrl: candidate.url,
            period: candidate.title ?? "NRB Monetary Policy",
            publishedAt: candidate.publishedAt,
            frequency: "irregular",
            valueKind: "actual",
            liveCapable: false,
            changeLabel: "Policy / repo rate",
            tone: "neutral",
            raw: { title: candidate.title },
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    return { ok: false, key: "policy_rate", error: lastError, via: "primary" };
  } catch (error) {
    return {
      ok: false,
      key: "policy_rate",
      via: "primary",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
