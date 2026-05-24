/**
 * Client-only Tesseract OCR for JPEG/PNG data URLs (e.g. after HEIC → JPEG).
 * Retries alternate languages and backoff for flaky mobile Safari runs.
 */

const MIN_CHARS_TO_STOP = 36;

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Could not read image for OCR.");
  return res.blob();
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export type ImageOcrResult = {
  text: string;
  /** Number of worker runs (including retries). */
  runs: number;
};

/**
 * Run OCR with automatic fallbacks: kor+eng (×2 with delay) → eng-only.
 * Returns best-effort text; may be empty if all passes fail (caller may throw).
 */
export async function runImageOcrWithRetries(imageDataUrl: string): Promise<ImageOcrResult> {
  const blob = await dataUrlToBlob(imageDataUrl);
  const { createWorker } = await import("tesseract.js");

  const langSequence = ["kor+eng", "kor+eng", "eng"] as const;
  let best = "";
  let runs = 0;
  let lastErr: unknown;

  for (let i = 0; i < langSequence.length; i++) {
    const lang = langSequence[i];
    try {
      if (i > 0) await sleep(180 + i * 120);
      const worker = await createWorker(lang);
      const {
        data: { text },
      } = await worker.recognize(blob);
      await worker.terminate();
      runs += 1;
      const trimmed = text.trim();
      if (trimmed.length > best.length) best = trimmed;
      if (trimmed.length >= MIN_CHARS_TO_STOP) {
        return { text: trimmed, runs };
      }
    } catch (e) {
      lastErr = e;
      await sleep(220 * (i + 1));
    }
  }

  if (best.length > 0) {
    return { text: best, runs };
  }

  if (lastErr instanceof Error) throw lastErr;
  if (lastErr) throw new Error(String(lastErr));
  return { text: "", runs };
}
