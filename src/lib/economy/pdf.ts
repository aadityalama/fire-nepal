/** PDF text extraction via unpdf (same stack as NEPSE filings). */

function ensureMathSumPrecise() {
  const math = Math as Math & { sumPrecise?: (values: Iterable<number>) => number };
  if (typeof math.sumPrecise === "function") return;
  math.sumPrecise = (values: Iterable<number>) => {
    let total = 0;
    for (const value of values) total += Number(value) || 0;
    return total;
  };
}

export async function extractPdfText(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  ensureMathSumPrecise();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  if (typeof text === "string") return text;
  if (Array.isArray(text)) return (text as string[]).join("\n");
  return String(text ?? "");
}

export async function fetchPdfText(
  url: string,
  timeoutMs = 45_000,
): Promise<{ text: string; bytes: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": "FireNepalEconomyEngine/1.0 (+https://firenepal.com; NRB publication reader)",
      },
    });
    if (!res.ok) throw new Error(`PDF HTTP ${res.status} for ${url}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1_000) throw new Error(`PDF too small (${buf.byteLength} bytes)`);
    const head = new TextDecoder("latin1").decode(buf.slice(0, 5));
    if (!head.startsWith("%PDF")) throw new Error("Response is not a PDF");
    const text = await extractPdfText(buf);
    if (!text || text.trim().length < 80) {
      throw new Error("PDF text extraction returned insufficient content");
    }
    return { text, bytes: buf.byteLength };
  } finally {
    clearTimeout(timer);
  }
}
