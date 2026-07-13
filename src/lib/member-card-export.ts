import { MEMBER_CARD_EXPORT_HEIGHT, MEMBER_CARD_EXPORT_WIDTH } from "@/components/membership/PremiumFireNepalMemberCard";
import type { MemberCardData } from "@/lib/member-card-profile";
import { validateMemberCardData } from "@/lib/member-card-profile";

const BASE_EXPORT_SCALE = 300 / 96;

function isMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iP(hone|od|ad)/.test(ua);
  const webkit = /WebKit/i.test(ua);
  const notOtherBrowser = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return ios && webkit && notOtherBrowser;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function openBlobInNewTab(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (opened) {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return true;
  }
  URL.revokeObjectURL(url);
  return false;
}

function memberCardFilename(data: MemberCardData, ext: "png" | "pdf"): string {
  const slug = data.fireNepalId.replace(/[^\w-]+/g, "-").slice(0, 48);
  return `fire-nepal-member-card-${slug}.${ext}`;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const bin = atob(dataUrl.split(",")[1] ?? "");
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolve(new Blob([bytes], { type: "image/png" }));
        } catch (error) {
          reject(error instanceof Error ? error : new Error("PNG export failed"));
        }
      },
      "image/png",
      1,
    );
  });
}

async function captureMemberCardCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.zIndex = "2147483646";
  clone.style.opacity = "1";
  clone.style.pointerEvents = "none";
  clone.style.width = `${MEMBER_CARD_EXPORT_WIDTH}px`;
  clone.style.height = `${MEMBER_CARD_EXPORT_HEIGHT}px`;
  clone.setAttribute("data-member-card-capture", "true");

  document.body.appendChild(clone);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const scale = isMobileSafari() ? Math.min(BASE_EXPORT_SCALE, 2) : BASE_EXPORT_SCALE;

  try {
    return await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#050505",
      width: MEMBER_CARD_EXPORT_WIDTH,
      height: MEMBER_CARD_EXPORT_HEIGHT,
      windowWidth: MEMBER_CARD_EXPORT_WIDTH,
      windowHeight: MEMBER_CARD_EXPORT_HEIGHT,
      logging: false,
      imageTimeout: 15_000,
      onclone: (doc) => {
        doc.querySelectorAll<HTMLElement>("[style*='backdrop-filter'], .backdrop-blur-md").forEach((node) => {
          node.style.backdropFilter = "none";
          node.style.setProperty("-webkit-backdrop-filter", "none");
          if (node.classList.contains("backdrop-blur-md")) {
            node.classList.remove("backdrop-blur-md");
            node.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
          }
        });
      },
    });
  } finally {
    clone.remove();
  }
}

export async function memberCardPngBlobFromElement(element: HTMLElement): Promise<Blob> {
  const canvas = await captureMemberCardCanvas(element);
  return canvasToPngBlob(canvas);
}

async function shareOrDownloadBlob(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
      await navigator.share({ title, text: title });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }

  if (isMobileSafari() && (blob.type === "image/png" || blob.type === "application/pdf")) {
    if (openBlobInNewTab(blob)) return;
  }

  downloadBlob(blob, filename);
}

export async function downloadMemberCardPngFromElement(element: HTMLElement, data: MemberCardData): Promise<void> {
  const validation = validateMemberCardData(data);
  if (validation) throw new Error(validation);
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  const blob = await memberCardPngBlobFromElement(element);
  await shareOrDownloadBlob(blob, memberCardFilename(data, "png"), "FIRE Nepal Member Card");
}

export async function downloadMemberCardPdfFromElement(element: HTMLElement, data: MemberCardData): Promise<void> {
  const validation = validateMemberCardData(data);
  if (validation) throw new Error(validation);
  await new Promise((resolve) => window.setTimeout(resolve, 500));

  const { jsPDF } = await import("jspdf");
  const canvas = await captureMemberCardCanvas(element);
  const imgData = canvas.toDataURL("image/png");

  const pageW = 297;
  const pageH = 210;
  const margin = 8;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const aspect = MEMBER_CARD_EXPORT_WIDTH / MEMBER_CARD_EXPORT_HEIGHT;

  let drawW = maxW;
  let drawH = drawW / aspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * aspect;
  }

  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  doc.addImage(imgData, "PNG", x, y, drawW, drawH);
  const pdfBlob = doc.output("blob");
  await shareOrDownloadBlob(pdfBlob, memberCardFilename(data, "pdf"), "FIRE Nepal Member Card");
}
