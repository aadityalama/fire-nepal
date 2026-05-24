"use client";

/**
 * Canvas-based preprocessing for salary-slip OCR (contrast, sharpen, margin trim).
 * Runs entirely in the browser — tuned for Korean payslips / factory photos.
 */

export type SlipPreprocessVariant = "balanced" | "factoryBlur";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for preprocessing."));
    img.src = src;
  });
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Trim near-white margins (document bounding box). */
function contentBoundingBox(data: ImageData, edgeThreshold = 248, minRunRatio = 0.004): { x0: number; y0: number; x1: number; y1: number } {
  const { width: w, height: h, data: d } = data;
  const rowHasInk = (y: number) => {
    let count = 0;
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = row + x * 4;
      if (luminance(d[i], d[i + 1], d[i + 2]) < edgeThreshold) count++;
    }
    return count >= Math.max(8, w * minRunRatio);
  };
  const colHasInk = (x: number) => {
    let count = 0;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      if (luminance(d[i], d[i + 1], d[i + 2]) < edgeThreshold) count++;
    }
    return count >= Math.max(8, h * minRunRatio);
  };

  let y0 = 0;
  while (y0 < h && !rowHasInk(y0)) y0++;
  let y1 = h - 1;
  while (y1 > y0 && !rowHasInk(y1)) y1--;
  let x0 = 0;
  while (x0 < w && !colHasInk(x0)) x0++;
  let x1 = w - 1;
  while (x1 > x0 && !colHasInk(x1)) x1--;

  if (y0 >= y1 || x0 >= x1) {
    return { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
  }

  const pad = 4;
  return {
    x0: Math.max(0, x0 - pad),
    y0: Math.max(0, y0 - pad),
    x1: Math.min(w - 1, x1 + pad),
    y1: Math.min(h - 1, y1 + pad),
  };
}

function grayscaleAndContrast(data: ImageData, contrast: number, brightness = 0) {
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = luminance(d[i], d[i + 1], d[i + 2]);
    v = 128 + (v - 128) * contrast + brightness;
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
}

/** 3×3 convolution on single-channel stored in R (G=B copy). */
function convolveMono(data: ImageData, kernel: number[], norm: number) {
  const { width: w, height: h, data: d } = data;
  const copy = new Uint8ClampedArray(d);
  const k = kernel;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const j = ((y + ky) * w + (x + kx)) * 4;
          sum += copy[j] * k[ki++];
        }
      }
      const v = Math.max(0, Math.min(255, sum / norm));
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
}

/** Mild blur for unsharp mask (separable box approx — 2 passes). */
function boxBlurMono(data: ImageData, radius: number) {
  const { width: w, height: h, data: d } = data;
  const tmp = new Uint8ClampedArray(w * h);
  const src = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) src[y * w + x] = d[(y * w + x) * 4];
  }
  let cur = src;
  let next = tmp;
  for (let pass = 0; pass < 2; pass++) {
    const horizontal = pass === 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let t = -radius; t <= radius; t++) {
          const xx = horizontal ? Math.min(w - 1, Math.max(0, x + t)) : x;
          const yy = horizontal ? y : Math.min(h - 1, Math.max(0, y + t));
          sum += cur[yy * w + xx];
          n++;
        }
        next[y * w + x] = sum / n;
      }
    }
    const swap = cur;
    cur = next;
    next = swap;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = cur[y * w + x];
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
}

function unsharpMask(data: ImageData, amount: number, blurR: number) {
  const { width: w, height: h, data: d } = data;
  const blur = new ImageData(new Uint8ClampedArray(d), w, h);
  boxBlurMono(blur, blurR);
  for (let i = 0; i < d.length; i += 4) {
    const base = d[i];
    const b = blur.data[i];
    let v = base + amount * (base - b);
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
}

/** Sharpen with Laplacian-ish kernel (fallback when unsharp too soft). */
function sharpenLaplacian(data: ImageData, strength: number) {
  const k = [0, -1, 0, -1, 4 + strength, -1, 0, -1, 0];
  convolveMono(data, k, 1 + strength * 0.25);
}

function drawScaledToCanvas(img: HTMLImageElement, maxSide: number) {
  let { naturalWidth: nw, naturalHeight: nh } = img;
  if (!nw || !nh) nw = nh = 1;
  const scale = Math.min(1, maxSide / Math.max(nw, nh));
  const cw = Math.max(1, Math.round(nw * scale));
  const ch = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, cw, ch);
  return { canvas, ctx, cw, ch, scale };
}

function imageDataToJpegDataUrl(data: ImageData, quality = 0.92): string {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported.");
  ctx.putImageData(data, 0, 0);
  return c.toDataURL("image/jpeg", quality);
}

/**
 * Full pipeline: optional downscale, auto-crop margins, grayscale, contrast, sharpen.
 */
export async function preprocessSlipImageForOcr(
  imageDataUrl: string,
  opts: { variant: SlipPreprocessVariant; maxSide?: number },
): Promise<string> {
  const maxSide = opts.maxSide ?? 2200;
  const img = await loadImage(imageDataUrl);
  const { canvas, ctx, cw, ch } = drawScaledToCanvas(img, maxSide);
  let id = ctx.getImageData(0, 0, cw, ch);
  const box = contentBoundingBox(id);
  const bw = Math.max(1, box.x1 - box.x0 + 1);
  const bh = Math.max(1, box.y1 - box.y0 + 1);
  const cropped = ctx.createImageData(bw, bh);
  const src = id.data;
  const dst = cropped.data;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((y + box.y0) * cw + (x + box.x0)) * 4;
      const di = (y * bw + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }

  grayscaleAndContrast(cropped, opts.variant === "factoryBlur" ? 1.38 : 1.18, opts.variant === "factoryBlur" ? 2 : 0);
  if (opts.variant === "factoryBlur") {
    unsharpMask(cropped, 1.15, 2);
    sharpenLaplacian(cropped, 0.85);
  } else {
    unsharpMask(cropped, 0.55, 1);
    sharpenLaplacian(cropped, 0.35);
  }

  return imageDataToJpegDataUrl(cropped, opts.variant === "factoryBlur" ? 0.9 : 0.93);
}

/** Rotate JPEG/PNG data URL by 0 / 90 / 180 / 270 (orientation from OSD). */
export async function rotateSlipDataUrl(imageDataUrl: string, degrees: number): Promise<string> {
  const d = ((degrees % 360) + 360) % 360;
  if (d === 0) return imageDataUrl;
  const img = await loadImage(imageDataUrl);
  const { naturalWidth: w, naturalHeight: h } = img;
  const swap = d === 90 || d === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageDataUrl;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((d * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  return canvas.toDataURL("image/jpeg", 0.93);
}
