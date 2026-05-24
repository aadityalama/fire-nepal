"use client";

/**
 * Korean salary slip OCR: canvas preprocess → optional OSD rotation →
 * Tesseract `kor+eng` with multiple PSM / sharpness passes and confidence scoring.
 */

import { createWorker, OEM, PSM } from "tesseract.js";
import type { Page } from "tesseract.js";
import { preprocessSlipImageForOcr, rotateSlipDataUrl, type SlipPreprocessVariant } from "@/lib/ocr-image-preprocess";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Could not read image for OCR.");
  return res.blob();
}

function meanWordConfidence(page: Page): number {
  const ws: number[] = [];
  const blocks = page.blocks ?? [];
  for (const b of blocks) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        for (const w of l.words ?? []) {
          if (typeof w.confidence === "number" && w.confidence > 0) ws.push(w.confidence);
        }
      }
    }
  }
  if (!ws.length) return typeof page.confidence === "number" ? page.confidence : 0;
  return ws.reduce((a, c) => a + c, 0) / ws.length;
}

function effectiveConfidence(page: Page): number {
  const pageC = typeof page.confidence === "number" ? page.confidence : 0;
  const wordC = meanWordConfidence(page);
  return Math.max(pageC, wordC, 0);
}

function scoreCandidate(text: string, confidence: number): number {
  const t = text.trim();
  const len = t.length;
  const conf = Number.isFinite(confidence) ? confidence : 0;
  let bonus = 0;
  if (/\d/.test(t)) bonus += 10;
  if (/[가-힣]/.test(t)) bonus += 14;
  if (/국민연금|건강보험|고용보험|급여|연장|퇴직/.test(t)) bonus += 18;
  return conf * 1.15 + Math.min(len, 520) * 0.11 + bonus;
}

export type KoreanSlipOcrResult = {
  text: string;
  /** 0–100 blended confidence (page + word mean). */
  confidence: number;
  runs: number;
  bestPsm: string;
  bestVariant: SlipPreprocessVariant;
  /** Applied correction from `worker.detect` (0 if none). */
  rotatedDegrees: number;
};

export async function runKoreanSalarySlipOcr(imageDataUrl: string): Promise<KoreanSlipOcrResult> {
  const worker = await createWorker("kor+eng", OEM.LSTM_ONLY, { legacyCore: true, legacyLang: true });

  const psms: PSM[] = [PSM.AUTO, PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT, PSM.SINGLE_BLOCK_VERT_TEXT];

  let bestText = "";
  let bestConf = 0;
  let bestScore = -1;
  let bestPsm = String(PSM.AUTO);
  let bestVariant: SlipPreprocessVariant = "balanced";
  let runs = 0;
  let rotatedDegrees = 0;

  const consider = (page: Page, psm: PSM | string, variant: SlipPreprocessVariant) => {
    const t = (page.text || "").trim();
    const c = effectiveConfidence(page);
    const sc = scoreCandidate(t, c);
    if (sc > bestScore) {
      bestScore = sc;
      bestText = t;
      bestConf = c;
      bestPsm = String(psm);
      bestVariant = variant;
    }
  };

  const recognizeBlob = async (blob: Blob, psm: PSM, variant: SlipPreprocessVariant) => {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      user_defined_dpi: "300",
    });
    const { data } = await worker.recognize(blob, { rotateAuto: true }, { text: true, blocks: true });
    runs += 1;
    consider(data, psm, variant);
    const t = (data.text || "").trim();
    const c = effectiveConfidence(data);
    return c >= 56 && t.length >= 72;
  };

  const runAllPsmsOnUrl = async (dataUrl: string, variant: SlipPreprocessVariant) => {
    const blob = await dataUrlToBlob(dataUrl);
    for (const psm of psms) {
      const early = await recognizeBlob(blob, psm, variant);
      if (early) return true;
    }
    return false;
  };

  try {
    const preBalanced = await preprocessSlipImageForOcr(imageDataUrl, { variant: "balanced" });
    let orientedUrl = preBalanced;
    try {
      const detBlob = await dataUrlToBlob(preBalanced);
      const { data: det } = await worker.detect(detBlob);
      runs += 1;
      const deg = det?.orientation_degrees;
      const oconf = det?.orientation_confidence ?? 0;
      if (typeof deg === "number" && deg !== 0 && typeof oconf === "number" && oconf > 0.35) {
        orientedUrl = await rotateSlipDataUrl(preBalanced, deg);
        rotatedDegrees = deg;
      }
    } catch {
      orientedUrl = preBalanced;
    }

    const earlyStop = await runAllPsmsOnUrl(orientedUrl, "balanced");

    if (!earlyStop && (bestConf < 46 || bestText.length < 45)) {
      const preFactory = await preprocessSlipImageForOcr(imageDataUrl, { variant: "factoryBlur" });
      let aggressiveUrl = preFactory;
      if (rotatedDegrees !== 0) {
        aggressiveUrl = await rotateSlipDataUrl(preFactory, rotatedDegrees);
      }
      await runAllPsmsOnUrl(aggressiveUrl, "factoryBlur");
    }

    // Last resort: different engine params (still kor+eng)
    if (bestConf < 40 || bestText.length < 28) {
      const blob = await dataUrlToBlob(orientedUrl);
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO_ONLY,
        user_defined_dpi: "320",
      });
      try {
        const { data } = await worker.recognize(blob, { rotateAuto: true }, { text: true, blocks: true });
        runs += 1;
        consider(data, "AUTO_ONLY_fallback", bestVariant);
      } catch {
        /* ignore */
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: bestText,
    confidence: Math.round(Math.min(100, Math.max(0, bestConf))),
    runs,
    bestPsm,
    bestVariant,
    rotatedDegrees,
  };
}
