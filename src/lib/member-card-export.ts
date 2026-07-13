import { MEMBER_CARD_EXPORT_HEIGHT, MEMBER_CARD_EXPORT_WIDTH } from "@/components/membership/PremiumFireNepalMemberCard";
import type { MemberCardData } from "@/lib/member-card-profile";
import { validateMemberCardData } from "@/lib/member-card-profile";

/** ~300 DPI capture relative to 96 CSS px. */
const EXPORT_SCALE = 300 / 96;

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

function memberCardFilename(data: MemberCardData, ext: "png" | "pdf"): string {
  const slug = data.fireNepalId.replace(/[^\w-]+/g, "-").slice(0, 48);
  return `fire-nepal-member-card-${slug}.${ext}`;
}

async function captureMemberCardCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    scale: EXPORT_SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#050505",
    width: MEMBER_CARD_EXPORT_WIDTH,
    height: MEMBER_CARD_EXPORT_HEIGHT,
    windowWidth: MEMBER_CARD_EXPORT_WIDTH,
    windowHeight: MEMBER_CARD_EXPORT_HEIGHT,
    logging: false,
  });
}

export async function memberCardPngBlobFromElement(element: HTMLElement): Promise<Blob> {
  const canvas = await captureMemberCardCanvas(element);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
      1,
    );
  });
}

async function shareOrDownloadBlob(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      throw error instanceof Error ? error : new Error("Could not share member card.");
    }
  }

  downloadBlob(blob, filename);
}

export async function downloadMemberCardPngFromElement(element: HTMLElement, data: MemberCardData): Promise<void> {
  const validation = validateMemberCardData(data);
  if (validation) throw new Error(validation);
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  const blob = await memberCardPngBlobFromElement(element);
  await shareOrDownloadBlob(blob, memberCardFilename(data, "png"), "FIRE Nepal Member Card");
}

export async function downloadMemberCardPdfFromElement(element: HTMLElement, data: MemberCardData): Promise<void> {
  const validation = validateMemberCardData(data);
  if (validation) throw new Error(validation);
  await new Promise((resolve) => window.setTimeout(resolve, 450));

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
