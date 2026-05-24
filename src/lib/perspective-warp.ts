"use client";

/** 2D point [x, y] in source image pixel space (TL, TR, BR, BL). */
export type QuadCorners = [[number, number], [number, number], [number, number], [number, number]];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for perspective warp."));
    img.src = src;
  });
}

function dist(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Solve 8×8 linear system (Gaussian elimination). */
function solve8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (Math.abs(f) < 1e-14) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * Homography (h8 = 1) mapping src[i] -> dst[i] for i=0..3.
 * Returns 9 entries [h0..h8] row-major 3×3.
 */
function homographyFrom4Points(src: QuadCorners, dst: QuadCorners): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [xp, yp] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -xp * x, -xp * y]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -yp * x, -yp * y]);
    b.push(yp);
  }
  const h8 = 1;
  const h = solve8(A, b);
  return [...h, h8];
}

function applyH(H: number[], x: number, y: number): [number, number] {
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;
  const w = h6 * x + h7 * y + h8;
  if (Math.abs(w) < 1e-9) return [0, 0];
  return [(h0 * x + h1 * y + h2) / w, (h3 * x + h4 * y + h5) / w];
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = sx - x0;
  const fy = sy - y0;
  const idx = (yy: number, xx: number) => (yy * w + xx) * 4;
  const i00 = idx(y0, x0);
  const i10 = idx(y0, x1);
  const i01 = idx(y1, x0);
  const i11 = idx(y1, x1);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r = lerp(lerp(data[i00], data[i10], fx), lerp(data[i01], data[i11], fx), fy);
  const g = lerp(lerp(data[i00 + 1], data[i10 + 1], fx), lerp(data[i01 + 1], data[i11 + 1], fx), fy);
  const bl = lerp(lerp(data[i00 + 2], data[i10 + 2], fx), lerp(data[i01 + 2], data[i11 + 2], fx), fy);
  const a = lerp(lerp(data[i00 + 3], data[i10 + 3], fx), lerp(data[i01 + 3], data[i11 + 3], fx), fy);
  return [r, g, bl, a];
}

/**
 * Perspective-rectify slip using four corner points on the source image (TL, TR, BR, BL).
 */
export async function warpSlipQuadToDataUrl(imageDataUrl: string, corners: QuadCorners, jpegQuality = 0.92): Promise<string> {
  const img = await loadImage(imageDataUrl);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const [tl, tr, br, bl] = corners;

  const outW = Math.max(32, Math.round(Math.max(dist(tl, tr), dist(bl, br))));
  const outH = Math.max(32, Math.round(Math.max(dist(tr, br), dist(tl, bl))));

  const dst: QuadCorners = [
    [0, 0],
    [outW - 1, 0],
    [outW - 1, outH - 1],
    [0, outH - 1],
  ];

  /** Maps output (rect) pixel coords → source image pixel coords. */
  const H = homographyFrom4Points(dst, corners);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = nw;
  srcCanvas.height = nh;
  const sctx = srcCanvas.getContext("2d");
  if (!sctx) return imageDataUrl;
  sctx.drawImage(img, 0, 0);
  const srcData = sctx.getImageData(0, 0, nw, nh);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const octx = outCanvas.getContext("2d");
  if (!octx) return imageDataUrl;
  const outImage = octx.createImageData(outW, outH);
  const od = outImage.data;
  const sd = srcData.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const [sx, sy] = applyH(H, x, y);
      if (sx < 0 || sy < 0 || sx > nw - 1 || sy > nh - 1) {
        const i = (y * outW + x) * 4;
        od[i] = od[i + 1] = od[i + 2] = 255;
        od[i + 3] = 255;
        continue;
      }
      const [r, g, b, a] = sampleBilinear(sd, nw, nh, sx, sy);
      const i = (y * outW + x) * 4;
      od[i] = r;
      od[i + 1] = g;
      od[i + 2] = b;
      od[i + 3] = a;
    }
  }
  octx.putImageData(outImage, 0, 0);
  return outCanvas.toDataURL("image/jpeg", jpegQuality);
}
