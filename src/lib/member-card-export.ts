import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import type { FireMembershipTier } from "@/lib/fire-membership";

const MEMBER_CARD_LOGO_SRC = "/logo.png";

export type MemberCardExportData = {
  fullName: string;
  avatarUrl: string | null;
  fireNepalId: string;
  tier: FireMembershipTier;
  tierLabel: string;
  expiryLabel: string;
  emailVerified?: boolean;
};

export const MEMBER_CARD_WIDTH = 760;
export const MEMBER_CARD_HEIGHT = 480;

const FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const TIER_CANVAS: Record<
  FireMembershipTier,
  { from: string; to: string; pill: string; pillText: string }
> = {
  free: { from: "#3f3f46", to: "#27272a", pill: "#52525b", pillText: "#f4f4f5" },
  premium: { from: "#047857", to: "#064e3b", pill: "#10b981", pillText: "#ecfdf5" },
  elite: { from: "#b45309", to: "#78350f", pill: "#f59e0b", pillText: "#fffbeb" },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FN";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https?:\/\//i.test(url)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function generateMemberQrImage(fireNepalId: string): Promise<HTMLImageElement | null> {
  if (!fireNepalId || fireNepalId === "Not assigned") return null;
  try {
    const QRCode = (await import("qrcode")).default;
    const payload = `${FIRE_NEPAL_CANONICAL_ORIGIN}/dashboard/profile?member=${encodeURIComponent(fireNepalId)}`;
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: { dark: "#064e3b", light: "#ffffff" },
    });
    return loadImageSafe(dataUrl);
  } catch {
    return null;
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  data: MemberCardExportData,
  avatar: HTMLImageElement | null,
) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;

  ctx.save();
  ctx.shadowColor = "rgba(16, 185, 129, 0.35)";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatar) {
    ctx.drawImage(avatar, x, y, size, size);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, "#10b981");
    gradient.addColorStop(1, "#059669");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#ecfdf5";
    ctx.font = `800 ${Math.round(size * 0.34)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(memberInitials(data.fullName), cx, cy);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(167, 243, 208, 0.65)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTierPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  tier: FireMembershipTier,
): number {
  const palette = TIER_CANVAS[tier];
  ctx.font = `800 13px ${FONT}`;
  const padX = 14;
  const padY = 7;
  const textW = ctx.measureText(label.toUpperCase()).width;
  const w = textW + padX * 2;
  const h = 28;

  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = palette.pill;
  ctx.fill();

  ctx.fillStyle = palette.pillText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), x + padX, y + h / 2 + 1);
  return w;
}

function drawMemberCard(
  ctx: CanvasRenderingContext2D,
  data: MemberCardExportData,
  width: number,
  height: number,
  avatar: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  qr: HTMLImageElement | null,
) {
  const palette = TIER_CANVAS[data.tier];

  const outerGrad = ctx.createLinearGradient(0, 0, width, height);
  outerGrad.addColorStop(0, "#021f1a");
  outerGrad.addColorStop(0.45, "#04140f");
  outerGrad.addColorStop(1, "#020807");
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, width, height);

  const cardX = 28;
  const cardY = 28;
  const cardW = width - 56;
  const cardH = height - 56;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, palette.from);
  cardGrad.addColorStop(0.55, "#04140f");
  cardGrad.addColorStop(1, palette.to);
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(167, 243, 208, 0.22)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();

  const innerX = cardX + 32;
  const innerY = cardY + 30;
  const innerRight = cardX + cardW - 32;

  if (logo) {
    const logoH = 34;
    const aspect = logo.naturalWidth / Math.max(logo.naturalHeight, 1);
    const logoW = logoH * aspect;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, innerX, innerY, logoW, logoH);
  } else {
    ctx.fillStyle = "#ecfdf5";
    ctx.font = `900 22px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("FIRE NEPAL", innerX, innerY);
  }

  ctx.fillStyle = "rgba(236, 253, 245, 0.72)";
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("MEMBER CARD", innerRight, innerY + 8);

  const avatarSize = 128;
  const avatarY = innerY + 52;
  drawAvatar(ctx, innerX, avatarY, avatarSize, data, avatar);

  const textX = innerX + avatarSize + 28;
  const name = data.fullName.trim() || "FIRE Nepal Member";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 30px ${FONT}`;
  const maxNameW = innerRight - textX - (qr ? 120 : 0);
  let displayName = name;
  while (displayName.length > 1 && ctx.measureText(displayName).width > maxNameW) {
    displayName = `${displayName.slice(0, -2)}…`;
  }
  ctx.fillText(displayName, textX, avatarY + 6);

  const pillY = avatarY + 46;
  const pillW = drawTierPill(ctx, textX, pillY, data.tierLabel, data.tier);
  if (data.emailVerified) {
    const badgeX = textX + pillW + 10;
    drawRoundedRect(ctx, badgeX, pillY, 78, 28, 14);
    ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
    ctx.fill();
    ctx.fillStyle = "#a7f3d0";
    ctx.font = `800 10px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("VERIFIED", badgeX + 10, pillY + 15);
  }

  const metaY = pillY + 48;
  ctx.fillStyle = "rgba(236, 253, 245, 0.78)";
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText("FIRE NEPAL ID", textX, metaY);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 16px ${FONT}`;
  ctx.fillText(data.fireNepalId, textX, metaY + 18);

  ctx.fillStyle = "rgba(236, 253, 245, 0.78)";
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText("MEMBERSHIP EXPIRES", textX, metaY + 54);
  ctx.fillStyle = "#fef3c7";
  ctx.font = `800 16px ${FONT}`;
  ctx.fillText(data.expiryLabel, textX, metaY + 72);

  if (qr) {
    const qrSize = 104;
    const qrX = innerRight - qrSize;
    const qrY = cardY + cardH - qrSize - 28;
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
    ctx.fill();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "rgba(236, 253, 245, 0.65)";
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO VERIFY", qrX + qrSize / 2, qrY + qrSize + 18);
  }

  ctx.fillStyle = "rgba(167, 243, 208, 0.55)";
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("www.firenepal.com", innerX, cardY + cardH - 22);
}

export async function createMemberCardCanvas(data: MemberCardExportData): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    throw new Error("Member card export is only available in the browser.");
  }

  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const width = MEMBER_CARD_WIDTH;
  const height = MEMBER_CARD_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");

  ctx.scale(dpr, dpr);

  const [avatar, logo, qr] = await Promise.all([
    data.avatarUrl ? loadImageSafe(data.avatarUrl) : Promise.resolve(null),
    loadImageSafe(MEMBER_CARD_LOGO_SRC),
    generateMemberQrImage(data.fireNepalId),
  ]);

  drawMemberCard(ctx, data, width, height, avatar, logo, qr);
  return canvas;
}

export async function memberCardPngBlob(data: MemberCardExportData): Promise<Blob> {
  const canvas = await createMemberCardCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
      0.94,
    );
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

function memberCardFilename(data: MemberCardExportData): string {
  const slug =
    data.fireNepalId && data.fireNepalId !== "Not assigned"
      ? data.fireNepalId.replace(/[^\w-]+/g, "-").slice(0, 48)
      : "member";
  return `fire-nepal-member-card-${slug}.png`;
}

/** Save or share a premium member card PNG across desktop and mobile browsers. */
export async function downloadMemberCardPng(data: MemberCardExportData): Promise<void> {
  const blob = await memberCardPngBlob(data);
  const filename = memberCardFilename(data);
  const file = new File([blob], filename, { type: "image/png" });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "FIRE Nepal Member Card",
        });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      throw error instanceof Error ? error : new Error("Could not share member card.");
    }
  }

  downloadBlob(blob, filename);
}
