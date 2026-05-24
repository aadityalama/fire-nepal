"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { warpSlipQuadToDataUrl, type QuadCorners } from "@/lib/perspective-warp";

const HIT = 36;

export type SlipCornerPickerCopy = {
  title: string;
  hint: string;
  reset: string;
  cancel: string;
  apply: string;
};

type SlipCornerPickerModalProps = {
  open: boolean;
  imageDataUrl: string;
  copy: SlipCornerPickerCopy;
  onClose: () => void;
  /** Returns rectified JPEG data URL. */
  onApply: (rectifiedDataUrl: string) => void | Promise<void>;
};

function defaultCorners(cw: number, ch: number, inset = 0.02): QuadCorners {
  const ix = cw * inset;
  const iy = ch * inset;
  return [
    [ix, iy],
    [cw - ix, iy],
    [cw - ix, ch - iy],
    [ix, ch - iy],
  ];
}

export function SlipCornerPickerModal({ open, imageDataUrl, copy, onClose, onApply }: SlipCornerPickerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);
  const [scale, setScale] = useState(1);
  const [corners, setCorners] = useState<QuadCorners>([
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !imageDataUrl) return;
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      const maxW = 880;
      const nw = el.naturalWidth;
      const nh = el.naturalHeight;
      const s = Math.min(1, maxW / nw);
      const w = Math.round(nw * s);
      const h = Math.round(nh * s);
      setImg(el);
      setScale(s);
      setCw(w);
      setCh(h);
      setCorners(defaultCorners(w, h, 0.02));
    };
    el.src = imageDataUrl;
  }, [open, imageDataUrl]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || !img || !cw || !ch) return;
    c.width = cw;
    c.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(5, 46, 22, 0.9)";
    for (const [x, y] of corners) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [img, cw, ch, corners]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const clientToCanvas = (clientX: number, clientY: number) => {
    const c = canvasRef.current;
    if (!c) return [0, 0] as [number, number];
    const r = c.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * cw;
    const y = ((clientY - r.top) / r.height) * ch;
    return [Math.max(0, Math.min(cw, x)), Math.max(0, Math.min(ch, y))] as [number, number];
  };

  const pickCorner = (x: number, y: number) => {
    let best = -1;
    let bestD = HIT;
    corners.forEach((p, i) => {
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!cw) return;
    const [x, y] = clientToCanvas(e.clientX, e.clientY);
    const idx = pickCorner(x, y);
    if (idx >= 0) {
      setDragIdx(idx);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragIdx === null || !cw) return;
    const [x, y] = clientToCanvas(e.clientX, e.clientY);
    setCorners((prev) => {
      const next = [...prev] as unknown as QuadCorners;
      next[dragIdx] = [x, y];
      return next;
    });
  };

  const onPointerUp = () => setDragIdx(null);

  async function handleApply() {
    if (!img || !scale) return;
    const naturalCorners: QuadCorners = corners.map(([x, y]) => [x / scale, y / scale] as [number, number]) as QuadCorners;
    setBusy(true);
    try {
      const out = await warpSlipQuadToDataUrl(imageDataUrl, naturalCorners, 0.92);
      await onApply(out);
      onClose();
    } catch {
      /* warp or OCR failed */
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-emerald-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slip-corner-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-emerald-100 bg-white p-4 shadow-2xl sm:p-6">
        <h3 id="slip-corner-title" className="text-lg font-black text-emerald-950 sm:text-xl">
          {copy.title}
        </h3>
        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">{copy.hint}</p>

        <div className="mt-4 flex justify-center overflow-x-auto rounded-2xl border border-emerald-100 bg-slate-50 p-2">
          {cw ? (
            <canvas
              ref={canvasRef}
              className="w-full max-w-[880px] touch-none cursor-crosshair rounded-xl shadow"
              style={{ height: "auto" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          ) : (
            <div className="py-16 text-sm font-bold text-slate-500">Loading…</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!cw}
            onClick={() => cw && ch && setCorners(defaultCorners(cw, ch, 0.02))}
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-40"
          >
            {copy.reset}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            disabled={busy || !cw}
            onClick={() => void handleApply()}
            className="ml-auto rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "…" : copy.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
