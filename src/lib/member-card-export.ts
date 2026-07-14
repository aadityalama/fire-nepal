import { MEMBER_CARD_EXPORT_HEIGHT, MEMBER_CARD_EXPORT_WIDTH } from "@/components/membership/PremiumFireNepalMemberCard";
import type { MemberCardData } from "@/lib/member-card-profile";
import { validateMemberCardData } from "@/lib/member-card-profile";

const BASE_EXPORT_SCALE = 300 / 96;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iP(hone|od|ad)/.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = isIOS();
  const webkit = /WebKit/i.test(ua);
  const notOtherBrowser = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return ios && webkit && notOtherBrowser;
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function linearSrgbToChannel(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return clampColorChannel(encoded * 255);
}

function parseCssNumber(value: string, percentBase = 1): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) return (parseFloat(trimmed) / 100) * percentBase;
  return parseFloat(trimmed);
}

function parseCssAlpha(value: string | undefined): number {
  if (!value) return 1;
  return Math.max(0, Math.min(1, parseCssNumber(value)));
}

function oklabToRgba(l: number, a: number, b: number, alpha = 1): string {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
  const lCubed = lPrime ** 3;
  const mCubed = mPrime ** 3;
  const sCubed = sPrime ** 3;
  const red = linearSrgbToChannel(4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed);
  const green = linearSrgbToChannel(-1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed);
  const blue = linearSrgbToChannel(-0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed);
  return alpha >= 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function labToRgba(l: number, a: number, b: number, alpha = 1): string {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const xr = fx ** 3 > epsilon ? fx ** 3 : (116 * fx - 16) / kappa;
  const yr = l > kappa * epsilon ? fy ** 3 : l / kappa;
  const zr = fz ** 3 > epsilon ? fz ** 3 : (116 * fz - 16) / kappa;
  const d50X = xr * 0.96422;
  const d50Y = yr;
  const d50Z = zr * 0.82521;
  const x = 0.9554734 * d50X - 0.0230985 * d50Y + 0.0632593 * d50Z;
  const y = -0.0283697 * d50X + 1.0099956 * d50Y + 0.0210414 * d50Z;
  const z = 0.012314 * d50X - 0.0205077 * d50Y + 1.3303659 * d50Z;
  const red = linearSrgbToChannel(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
  const green = linearSrgbToChannel(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  const blue = linearSrgbToChannel(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
  return alpha >= 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function modernColorToRgba(match: string): string {
  const fnMatch = match.match(/^([a-z0-9-]+)\((.*)\)$/i);
  if (!fnMatch) return match;
  const [, fn, rawBody] = fnMatch;
  const [rawComponents, rawAlpha] = rawBody.split("/").map((part) => part.trim());
  const components = rawComponents.split(/\s+/).filter(Boolean);
  const alpha = parseCssAlpha(rawAlpha);

  if (fn === "oklab" && components.length >= 3) {
    return oklabToRgba(parseCssNumber(components[0]), parseCssNumber(components[1]), parseCssNumber(components[2]), alpha);
  }

  if (fn === "oklch" && components.length >= 3) {
    const l = parseCssNumber(components[0]);
    const chroma = parseCssNumber(components[1]);
    const hue = (parseCssNumber(components[2]) * Math.PI) / 180;
    return oklabToRgba(l, Math.cos(hue) * chroma, Math.sin(hue) * chroma, alpha);
  }

  if (fn === "lab" && components.length >= 3) {
    return labToRgba(parseCssNumber(components[0], 100), parseCssNumber(components[1]), parseCssNumber(components[2]), alpha);
  }

  if (fn === "lch" && components.length >= 3) {
    const l = parseCssNumber(components[0], 100);
    const chroma = parseCssNumber(components[1]);
    const hue = (parseCssNumber(components[2]) * Math.PI) / 180;
    return labToRgba(l, Math.cos(hue) * chroma, Math.sin(hue) * chroma, alpha);
  }

  if (fn === "color" && components.length >= 4) {
    const channels = components.slice(1, 4).map((component) => parseCssNumber(component, 255));
    const normalized = channels.map((channel) => (channel <= 1 ? channel * 255 : channel));
    const [red, green, blue] = normalized.map(clampColorChannel);
    return alpha >= 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return match;
}

function replaceModernColorFunctions(value: string): string {
  if (!/(oklab|oklch|lab|lch|color)\(/i.test(value)) return value;
  return value.replace(/\b(?:oklab|oklch|lab|lch|color)\([^()]+\)/gi, modernColorToRgba);
}

/** html2canvas cannot parse oklab/oklch from modern Safari/Chrome computed styles. */
function sanitizeModernColorsForHtml2Canvas(root: HTMLElement) {
  const colorProperties = [
    "background-color",
    "background-image",
    "border-bottom-color",
    "border-left-color",
    "border-right-color",
    "border-top-color",
    "box-shadow",
    "caret-color",
    "color",
    "fill",
    "outline-color",
    "stop-color",
    "stroke",
    "text-decoration-color",
    "text-shadow",
  ];
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement | SVGElement>("*"))];

  elements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    colorProperties.forEach((property) => {
      const value = styles.getPropertyValue(property);
      const sanitized = replaceModernColorFunctions(value);
      if (sanitized !== value) {
        (element as HTMLElement).style.setProperty(property, sanitized);
      }
    });
  });
}

/** Strip backdrop-filter / blur effects that break or blank html2canvas on WebKit. */
function stripUnsupportedCaptureStyles(root: HTMLElement) {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  elements.forEach((node) => {
    const computed = window.getComputedStyle(node);
    const hasBackdrop =
      (computed.backdropFilter && computed.backdropFilter !== "none") ||
      (computed.getPropertyValue("-webkit-backdrop-filter") &&
        computed.getPropertyValue("-webkit-backdrop-filter") !== "none");

    if (hasBackdrop || node.className.toString().includes("backdrop-blur")) {
      node.style.backdropFilter = "none";
      node.style.setProperty("-webkit-backdrop-filter", "none");
      for (const cls of Array.from(node.classList)) {
        if (cls.startsWith("backdrop-blur") || cls.startsWith("supports-[backdrop-filter")) {
          node.classList.remove(cls);
        }
      }
      const bg = computed.backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
        node.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
      }
    }

    // Heavy CSS filters are unreliable in html2canvas; keep the solid layer underneath.
    if (computed.filter && computed.filter !== "none" && /blur\(/i.test(computed.filter)) {
      node.style.filter = "none";
    }
  });
}

async function waitForExportReadyAttribute(root: HTMLElement) {
  const exportRoot =
    root.matches("[data-member-card-export='true']")
      ? root
      : root.querySelector<HTMLElement>("[data-member-card-export='true']");
  if (!exportRoot) return;

  if (exportRoot.getAttribute("data-export-ready") === "true") return;

  await new Promise<void>((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (exportRoot.getAttribute("data-export-ready") === "true" || Date.now() - started > 4_000) {
        resolve();
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

async function waitForCaptureReady(root: HTMLElement) {
  await waitForExportReadyAttribute(root);

  if (document.fonts?.ready) {
    try {
      await Promise.race([document.fonts.ready, new Promise<void>((r) => window.setTimeout(r, 2_000))]);
    } catch {
      /* ignore */
    }
  }

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      const ready =
        typeof image.decode === "function"
          ? image.decode().then(() => undefined).catch(() => undefined)
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            });
      return Promise.race([ready, new Promise<void>((r) => window.setTimeout(r, 2_000))]);
    }),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
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

/** Prefer <a target=_blank> over window.open — gesture is often spent after async capture. */
function openBlobInNewTab(blob: Blob): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return true;
  } catch {
    return false;
  }
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

function prepareCaptureHost(): { host: HTMLElement; cleanup: () => void } {
  const needsWideViewport = isIOS() || isMobileSafari() || window.innerWidth < MEMBER_CARD_EXPORT_WIDTH;

  if (!needsWideViewport) {
    const host = document.createElement("div");
    host.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      `width:${MEMBER_CARD_EXPORT_WIDTH}px`,
      `height:${MEMBER_CARD_EXPORT_HEIGHT}px`,
      "margin:0",
      "padding:0",
      "overflow:hidden",
      "z-index:2147483646",
      "pointer-events:none",
      "background:#050505",
    ].join(";");
    document.body.appendChild(host);
    return {
      host,
      cleanup: () => host.remove(),
    };
  }

  // Narrow viewports (iPhone Safari): paint inside a true 1400×900 iframe so
  // html2canvas's window metrics match the card instead of the 390px layout viewport.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "member-card-capture");
  iframe.setAttribute("aria-hidden", "true");
  iframe.width = String(MEMBER_CARD_EXPORT_WIDTH);
  iframe.height = String(MEMBER_CARD_EXPORT_HEIGHT);
  iframe.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${MEMBER_CARD_EXPORT_WIDTH}px`,
    `height:${MEMBER_CARD_EXPORT_HEIGHT}px`,
    "border:0",
    "margin:0",
    "padding:0",
    "z-index:2147483646",
    "opacity:1",
    "visibility:visible",
    "pointer-events:none",
    "background:#050505",
  ].join(";");
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    iframe.remove();
    throw new Error("Could not prepare membership card capture frame.");
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><base href="${location.origin}/"><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#050505;overflow:hidden;width:${MEMBER_CARD_EXPORT_WIDTH}px;height:${MEMBER_CARD_EXPORT_HEIGHT}px;"></body></html>`,
  );
  idoc.close();

  document.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
    idoc.head.appendChild(node.cloneNode(true));
  });

  return {
    host: idoc.body,
    cleanup: () => iframe.remove(),
  };
}

async function captureMemberCardCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  // Wait on the live dedicated export tree (QR, fonts, images) before cloning.
  await waitForCaptureReady(source);

  const { host, cleanup } = prepareCaptureHost();

  // Capture the dedicated export tree (same PremiumFireNepalMemberCard JSX as preview) at 1400×900.
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.opacity = "1";
  clone.style.visibility = "visible";
  clone.style.pointerEvents = "none";
  clone.style.transform = "none";
  clone.style.width = `${MEMBER_CARD_EXPORT_WIDTH}px`;
  clone.style.height = `${MEMBER_CARD_EXPORT_HEIGHT}px`;
  clone.style.minWidth = `${MEMBER_CARD_EXPORT_WIDTH}px`;
  clone.style.minHeight = `${MEMBER_CARD_EXPORT_HEIGHT}px`;
  clone.style.maxWidth = `${MEMBER_CARD_EXPORT_WIDTH}px`;
  clone.style.maxHeight = `${MEMBER_CARD_EXPORT_HEIGHT}px`;
  clone.style.overflow = "hidden";
  clone.style.backgroundColor = "#050505";
  clone.setAttribute("data-member-card-capture", "true");
  clone.setAttribute("aria-hidden", "true");

  host.appendChild(clone);

  try {
    stripUnsupportedCaptureStyles(clone);
    sanitizeModernColorsForHtml2Canvas(clone);
    await waitForCaptureReady(clone);

    const scale = isIOS() || isMobileSafari() ? Math.min(BASE_EXPORT_SCALE, 2) : BASE_EXPORT_SCALE;
    const view = clone.ownerDocument?.defaultView ?? window;

    return await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#050505",
      width: MEMBER_CARD_EXPORT_WIDTH,
      height: MEMBER_CARD_EXPORT_HEIGHT,
      windowWidth: MEMBER_CARD_EXPORT_WIDTH,
      windowHeight: MEMBER_CARD_EXPORT_HEIGHT,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      imageTimeout: 15_000,
      onclone: (clonedDoc, cloned) => {
        const cloneView = clonedDoc.defaultView ?? view;
        const colorProperties = [
          "background-color",
          "background-image",
          "border-bottom-color",
          "border-left-color",
          "border-right-color",
          "border-top-color",
          "box-shadow",
          "color",
          "fill",
          "stroke",
          "text-shadow",
        ];
        const nodes = [cloned, ...Array.from(cloned.querySelectorAll<HTMLElement>("*"))];
        nodes.forEach((node) => {
          node.style.opacity = "1";
          node.style.visibility = "visible";
          node.style.transform = "none";
          const computed = cloneView.getComputedStyle(node);
          const hasBackdrop =
            (computed.backdropFilter && computed.backdropFilter !== "none") ||
            (computed.getPropertyValue("-webkit-backdrop-filter") &&
              computed.getPropertyValue("-webkit-backdrop-filter") !== "none");
          if (hasBackdrop || node.className.toString().includes("backdrop-blur")) {
            node.style.backdropFilter = "none";
            node.style.setProperty("-webkit-backdrop-filter", "none");
            const bg = computed.backgroundColor;
            if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
              node.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
            }
          }
          if (computed.filter && computed.filter !== "none" && /blur\(/i.test(computed.filter)) {
            node.style.filter = "none";
          }
          colorProperties.forEach((property) => {
            const value = computed.getPropertyValue(property);
            const sanitized = replaceModernColorFunctions(value);
            if (sanitized !== value) node.style.setProperty(property, sanitized);
          });
        });
      },
    });
  } finally {
    cleanup();
  }
}

export async function memberCardPngBlobFromElement(element: HTMLElement): Promise<Blob> {
  const canvas = await captureMemberCardCanvas(element);
  return canvasToPngBlob(canvas);
}

/**
 * Cross-platform save:
 * 1) Web Share API with file (iOS/Android) when supported
 * 2) Open blob in a new tab on iOS (download= is ignored)
 * 3) Standard <a download> for desktop/Android
 */
async function shareOrDownloadBlob(blob: Blob, filename: string, title: string): Promise<void> {
  const mime = blob.type || (filename.endsWith(".pdf") ? "application/pdf" : "image/png");
  const typedBlob = blob.type ? blob : new Blob([blob], { type: mime });
  const file = new File([typedBlob], filename, { type: mime });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      // Fall through to blob/download fallbacks.
    }
  }

  if (isIOS()) {
    if (openBlobInNewTab(typedBlob)) return;
  }

  downloadBlob(typedBlob, filename);
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
  const rawPdf = doc.output("blob");
  const pdfBlob = rawPdf.type === "application/pdf" ? rawPdf : new Blob([rawPdf], { type: "application/pdf" });
  await shareOrDownloadBlob(pdfBlob, memberCardFilename(data, "pdf"), "FIRE Nepal Member Card");
}
