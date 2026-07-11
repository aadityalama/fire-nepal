import type { Currency } from "@/lib/expense-utils";
import { initials } from "@/lib/expense-utils";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { hasGroupProfile, type GroupProfile } from "@/lib/group-profile";
import { monthKeyToLongLabel } from "@/lib/roommate-expense-share";

export type SettlementShareMemberLine = {
  memberId: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  paidLabel: string;
  shareLabel: string;
  balanceLabel: string;
  roleLabel: "Receives" | "Pays" | "Settled";
  role: "receives" | "pays" | "settled";
  balanceNpr: number;
};

export type SettlementShareTransferLine = {
  fromName: string;
  toName: string;
  amountLabel: string;
};

export type SettlementLocationInput = {
  companyName?: string | null;
  roomNumber?: string | null;
  companyType?: string | null;
  description?: string | null;
  logoUrl?: string | null;
};

export type SettlementShareData = {
  monthKey: string;
  monthLabel: string;
  currency: Currency;
  members: SettlementShareMemberLine[];
  transfers: SettlementShareTransferLine[];
  totalGroupExpenseLabel: string;
  receivesTotalLabel: string;
  paysTotalLabel: string;
  totalMembers: number;
  totalTransfers: number;
  companyName: string;
  roomNumber: string;
  companyType: string;
  description: string;
  logoUrl: string;
  hasGroupBranding: boolean;
  reportHeader: string;
  reportSubtitle: string | null;
  roomBadgeLabel: string | null;
  generatedOnLabel: string;
  generatedAtLabel: string;
  siteUrl: string;
  footerUrl: string;
};

const FIRE_NEPAL_SITE = "https://firenepal.com";
export const FIRE_NEPAL_LOGO_SRC = "/email-logo.png";
export const SETTLEMENT_REPORT_FOOTER = {
  poweredBy: "Powered by FIRE Nepal",
  tagline: "Smart Expense & Settlement Platform",
  url: "www.firenepal.com",
} as const;
const DIVIDER = "━━━━━━━━━━━━━━━━";

export const SETTLEMENT_COLOR_RECEIVES = "#10B981";
export const SETTLEMENT_COLOR_PAYS = "#DC2626";
export const SETTLEMENT_COLOR_NEUTRAL = "#111827";
export const SETTLEMENT_COLOR_MUTED = "#6B7280";

export function normalizeSettlementSetting(value?: string | null): string {
  return value?.trim() ?? "";
}

const DEFAULT_SETTLEMENT_TITLE = "Group Settlement Summary";

export function buildSettlementReportHeader(location: SettlementLocationInput): string {
  const profile: GroupProfile = {
    companyName: normalizeSettlementSetting(location.companyName),
    roomNumber: normalizeSettlementSetting(location.roomNumber),
    companyType: normalizeSettlementSetting(location.companyType),
    description: normalizeSettlementSetting(location.description),
    logoUrl: normalizeSettlementSetting(location.logoUrl),
  };
  if (!hasGroupProfile(profile)) return DEFAULT_SETTLEMENT_TITLE;
  const company = profile.companyName;
  const room = profile.roomNumber ? `Room ${profile.roomNumber}` : "";
  if (company && room) return `${company}\n${room}`;
  return company || room || DEFAULT_SETTLEMENT_TITLE;
}

export function buildSettlementReportSubtitle(location: SettlementLocationInput): string | null {
  const profile: GroupProfile = {
    companyName: normalizeSettlementSetting(location.companyName),
    roomNumber: normalizeSettlementSetting(location.roomNumber),
    companyType: normalizeSettlementSetting(location.companyType),
    description: normalizeSettlementSetting(location.description),
    logoUrl: normalizeSettlementSetting(location.logoUrl),
  };
  return hasGroupProfile(profile) ? DEFAULT_SETTLEMENT_TITLE : null;
}

export function buildSettlementHeaderDisplayText(data: SettlementShareData): string {
  if (!data.hasGroupBranding) return `🏠 ${DEFAULT_SETTLEMENT_TITLE}`;
  const lines: string[] = [];
  if (data.companyName) lines.push(data.companyName);
  if (data.roomNumber) lines.push(`Room ${data.roomNumber}`);
  lines.push("");
  lines.push(DEFAULT_SETTLEMENT_TITLE);
  return lines.join("\n");
}

export function buildSettlementRoomBadgeLabel(location: SettlementLocationInput): string | null {
  const room = normalizeSettlementSetting(location.roomNumber);
  if (!room) return null;
  return `ROOM ${room.toUpperCase()}`;
}

export function settlementReportRoomBadgeClass() {
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

export function formatSettlementGeneratedTimestamp(date = new Date()) {
  const generatedOnLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const generatedAtLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

  return { generatedOnLabel, generatedAtLabel };
}

export function memberRoleIcon(role: SettlementShareMemberLine["role"]) {
  if (role === "receives") return "↑";
  if (role === "pays") return "↓";
  return "";
}

export function memberRoleColor(role: SettlementShareMemberLine["role"]) {
  if (role === "receives") return SETTLEMENT_COLOR_RECEIVES;
  if (role === "pays") return SETTLEMENT_COLOR_PAYS;
  return SETTLEMENT_COLOR_MUTED;
}

export function defaultSettlementSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return FIRE_NEPAL_SITE;
}

function currencyMetaLive(krwPerNpr: number) {
  return {
    NPR: { symbol: "रु", rate: 1 },
    KRW: { symbol: "₩", rate: krwPerNpr },
    USD: { symbol: "$", rate: 0.0075 },
  };
}

function fmtAmount(npr: number, currency: Currency, krwPerNpr: number) {
  const meta = currencyMetaLive(krwPerNpr)[currency];
  const converted = npr * meta.rate;
  const maximumFractionDigits = currency === "USD" ? 2 : 0;
  return `${meta.symbol}${converted.toLocaleString("en-US", { maximumFractionDigits })}`;
}

function fmtSignedBalance(npr: number, currency: Currency, krwPerNpr: number) {
  const meta = currencyMetaLive(krwPerNpr)[currency];
  const converted = Math.abs(npr) * meta.rate;
  const maximumFractionDigits = currency === "USD" ? 2 : 0;
  const value = converted.toLocaleString("en-US", { maximumFractionDigits });
  if (npr > 1) return `+${meta.symbol}${value}`;
  if (npr < -1) return `-${meta.symbol}${value}`;
  return `${meta.symbol}${value}`;
}

export function buildSettlementShareData(input: {
  monthKey: string;
  members: string[];
  memberLabels: Record<string, string>;
  memberAvatars?: Record<string, string | undefined>;
  balances: Record<string, number>;
  paidByMember: Record<string, number>;
  memberExpectedShare: Record<string, number>;
  totalExpenseNpr: number;
  transfers: Array<{ from: string; to: string; amount: number }>;
  transferLabels: Array<{ fromName: string; toName: string }>;
  currency: Currency;
  krwPerNpr?: number;
  siteUrl?: string;
  companyName?: string | null;
  roomNumber?: string | null;
  companyType?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  generatedAt?: Date;
}): SettlementShareData {
  const krwPerNpr = input.krwPerNpr ?? FALLBACK_KRW_PER_NPR;
  const generatedAt = input.generatedAt ?? new Date();
  const { generatedOnLabel, generatedAtLabel } = formatSettlementGeneratedTimestamp(generatedAt);
  const companyName = normalizeSettlementSetting(input.companyName);
  const roomNumber = normalizeSettlementSetting(input.roomNumber);
  const companyType = normalizeSettlementSetting(input.companyType);
  const description = normalizeSettlementSetting(input.description);
  const logoUrl = normalizeSettlementSetting(input.logoUrl);
  const location = { companyName, roomNumber, companyType, description, logoUrl };
  const hasGroupBranding = hasGroupProfile({
    companyName,
    roomNumber,
    companyType,
    description,
    logoUrl,
  });
  const reportHeader = buildSettlementReportHeader(location);
  const reportSubtitle = buildSettlementReportSubtitle(location);
  const roomBadgeLabel = buildSettlementRoomBadgeLabel(location);

  const memberLines: SettlementShareMemberLine[] = input.members.map((memberId) => {
    const balanceNpr = input.balances[memberId] ?? 0;
    const name = input.memberLabels[memberId] ?? memberId;
    const paidNpr = input.paidByMember[memberId] ?? 0;
    const shareNpr = input.memberExpectedShare[memberId] ?? 0;

    let role: SettlementShareMemberLine["role"] = "settled";
    let roleLabel: SettlementShareMemberLine["roleLabel"] = "Settled";
    if (balanceNpr > 1) {
      role = "receives";
      roleLabel = "Receives";
    } else if (balanceNpr < -1) {
      role = "pays";
      roleLabel = "Pays";
    }

    return {
      memberId,
      name,
      initials: initials(name),
      avatarUrl: input.memberAvatars?.[memberId],
      paidLabel: fmtAmount(paidNpr, input.currency, krwPerNpr),
      shareLabel: fmtAmount(shareNpr, input.currency, krwPerNpr),
      balanceLabel: fmtSignedBalance(balanceNpr, input.currency, krwPerNpr),
      roleLabel,
      role,
      balanceNpr,
    };
  });

  const transfers: SettlementShareTransferLine[] = input.transfers.map((t, i) => ({
    fromName: input.transferLabels[i]?.fromName ?? t.from,
    toName: input.transferLabels[i]?.toName ?? t.to,
    amountLabel: fmtAmount(t.amount, input.currency, krwPerNpr),
  }));

  let receivesTotalNpr = 0;
  let paysTotalNpr = 0;
  for (const memberId of input.members) {
    const balanceNpr = input.balances[memberId] ?? 0;
    if (balanceNpr > 1) receivesTotalNpr += balanceNpr;
    if (balanceNpr < -1) paysTotalNpr += Math.abs(balanceNpr);
  }

  return {
    monthKey: input.monthKey,
    monthLabel: monthKeyToLongLabel(input.monthKey),
    currency: input.currency,
    members: memberLines,
    transfers,
    totalGroupExpenseLabel: fmtAmount(input.totalExpenseNpr, input.currency, krwPerNpr),
    receivesTotalLabel: fmtSignedBalance(receivesTotalNpr, input.currency, krwPerNpr),
    paysTotalLabel: fmtAmount(paysTotalNpr, input.currency, krwPerNpr),
    totalMembers: input.members.length,
    totalTransfers: transfers.length,
    companyName,
    roomNumber,
    companyType,
    description,
    logoUrl,
    hasGroupBranding,
    reportHeader,
    reportSubtitle,
    roomBadgeLabel,
    generatedOnLabel,
    generatedAtLabel,
    siteUrl: input.siteUrl ?? defaultSettlementSiteUrl(),
    footerUrl: FIRE_NEPAL_SITE,
  };
}

export function buildSettlementShareCardText(data: SettlementShareData): string {
  const memberBlock = data.members
    .map((m) => {
      const icon = memberRoleIcon(m.role);
      const prefix = icon ? `${icon} ` : "";
      return [
        `${prefix}${m.name}`,
        `Paid: ${m.paidLabel}`,
        `Share: ${m.shareLabel}`,
        `Balance: ${m.balanceLabel}`,
      ].join("\n");
    })
    .join("\n\n");

  const transferBlock =
    data.transfers.length > 0
      ? data.transfers
          .map((t) => `🔴 ${t.fromName} → 🟢 ${t.toName}\n${t.amountLabel}`)
          .join("\n\n")
      : "All settled — no transfers needed";

  return [
    buildSettlementHeaderDisplayText(data),
    "",
    "Settlement Period:",
    data.monthLabel,
    "",
    "Generated On:",
    data.generatedOnLabel,
    data.generatedAtLabel,
    "",
    DIVIDER,
    "",
    "MEMBER SETTLEMENT BREAKDOWN",
    "",
    memberBlock,
    "",
    DIVIDER,
    "",
    "FINAL TRANSFERS",
    "",
    transferBlock,
    "",
    DIVIDER,
    "",
    "REPORT SUMMARY",
    "",
    `Total Group Expense: ${data.totalGroupExpenseLabel}`,
    `Total Members: ${data.totalMembers}`,
    `Total Transfers: ${data.totalTransfers}`,
    "",
    SETTLEMENT_REPORT_FOOTER.poweredBy,
    SETTLEMENT_REPORT_FOOTER.tagline,
    SETTLEMENT_REPORT_FOOTER.url,
  ].join("\n");
}

export function buildSettlementShareSocialMessage(data: SettlementShareData): string {
  const memberBlock = data.members
    .map((m) => {
      const icon = memberRoleIcon(m.role);
      const prefix = icon ? `${icon} ` : "";
      return [
        `${prefix}${m.name}`,
        `Paid: ${m.paidLabel}`,
        `Share: ${m.shareLabel}`,
        `Balance: ${m.balanceLabel}`,
      ].join("\n");
    })
    .join("\n\n");

  const transferBlock =
    data.transfers.length > 0
      ? data.transfers
          .map((t) => `🔴 ${t.fromName} → 🟢 ${t.toName}\n${t.amountLabel}`)
          .join("\n\n")
      : "All settled — no transfers needed";

  return [
    buildSettlementHeaderDisplayText(data),
    "",
    `Settlement Period: ${data.monthLabel}`,
    `Generated: ${data.generatedOnLabel} · ${data.generatedAtLabel}`,
    "",
    "MEMBER SETTLEMENT BREAKDOWN",
    "",
    memberBlock,
    "",
    "FINAL TRANSFERS",
    "",
    transferBlock,
    "",
    `Total group expense: ${data.totalGroupExpenseLabel}`,
    `Members: ${data.totalMembers}`,
    `Transfers: ${data.totalTransfers}`,
    "",
    SETTLEMENT_REPORT_FOOTER.poweredBy,
    SETTLEMENT_REPORT_FOOTER.tagline,
    SETTLEMENT_REPORT_FOOTER.url,
  ].join("\n");
}

export function lineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
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

async function preloadMemberAvatars(members: SettlementShareMemberLine[]) {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    members.map(async (member) => {
      if (!member.avatarUrl) return;
      const img = await loadImageSafe(member.avatarUrl);
      if (img) map.set(member.memberId, img);
    }),
  );
  return map;
}

async function preloadGroupLogo(logoUrl: string): Promise<HTMLImageElement | null> {
  if (!logoUrl) return null;
  return loadImageSafe(logoUrl);
}

async function preloadFireNepalLogo(): Promise<HTMLImageElement | null> {
  return loadImageSafe(FIRE_NEPAL_LOGO_SRC);
}

function drawFireNepalBrandLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  rightX: number,
  topY: number,
  height: number,
) {
  if (!logo) return;
  const aspect = logo.naturalWidth / Math.max(logo.naturalHeight, 1);
  const drawH = height;
  const drawW = drawH * aspect;
  const x = rightX - drawW;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(logo, x, topY, drawW, drawH);
}

function drawGroupLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  logo: HTMLImageElement | null,
) {
  const r = 14;
  ctx.save();
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.clip();
  if (logo) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, x, y, size, size);
  } else {
    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.stroke();
}

function drawSettlementBrandingHeader(
  ctx: CanvasRenderingContext2D,
  data: SettlementShareData,
  innerX: number,
  y: number,
  contentRight: number,
  logo: HTMLImageElement | null,
  fireNepalLogo: HTMLImageElement | null,
): number {
  const logoSize = 48;
  const textX = logo ? innerX + logoSize + 14 : innerX;
  let cursorY = y;
  const brandLogoH = 36;

  drawFireNepalBrandLogo(ctx, fireNepalLogo, contentRight, y, brandLogoH);

  if (logo) {
    drawGroupLogo(ctx, innerX, y - 2, logoSize, logo);
    cursorY = y + 4;
  }

  if (!data.hasGroupBranding) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#111827";
    ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`🏠 ${DEFAULT_SETTLEMENT_TITLE}`, innerX, cursorY);
    return cursorY + 28;
  }

  ctx.textAlign = "left";
  if (data.companyName) {
    ctx.fillStyle = "#111827";
    ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(data.companyName, textX, cursorY);
    cursorY += 26;
  }
  if (data.roomNumber) {
    ctx.fillStyle = "#10B981";
    ctx.font = "500 16px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Room ${data.roomNumber}`, textX, cursorY);
    cursorY += 22;
  }
  if (data.reportSubtitle) {
    cursorY += 6;
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(data.reportSubtitle, textX, cursorY);
    cursorY += 18;
  }
  return Math.max(cursorY + 6, y + brandLogoH + 4);
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, x: number, y: number, title: string) {
  ctx.textAlign = "left";
  ctx.font = "700 11px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.fillText(title, x, y);
}

function drawMemberCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  member: SettlementShareMemberLine,
  avatarImages: Map<string, HTMLImageElement>,
) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  const roleTint =
    member.role === "receives" ? "#d1fae5" : member.role === "pays" ? "#fee2e2" : "#f1f5f9";
  const roleInk = memberRoleColor(member.role);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const img = avatarImages.get(member.memberId);
  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = roleTint;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = roleInk;
    ctx.font = `700 ${Math.round(size * 0.36)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(member.initials, cx, cy);
  }
  ctx.restore();

  ctx.strokeStyle = roleInk;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLabelAmountRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  amount: string,
  x: number,
  y: number,
  innerW: number,
  amountColor: string,
  fontSize = 12,
  amountWeight = 700,
) {
  ctx.textAlign = "left";
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "#6B7280";
  ctx.fillText(label, x, y);
  ctx.textAlign = "right";
  ctx.font = `${amountWeight} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = amountColor;
  ctx.fillText(amount, x + innerW, y);
  ctx.textAlign = "left";
}

function drawTransferNames(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fromName: string,
  toName: string,
) {
  const arrow = " → ";
  ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = SETTLEMENT_COLOR_PAYS;
  ctx.fillText(fromName, x, y);
  const fromW = ctx.measureText(fromName).width;
  ctx.fillStyle = SETTLEMENT_COLOR_MUTED;
  ctx.fillText(arrow, x + fromW, y);
  const arrowW = ctx.measureText(arrow).width;
  ctx.fillStyle = SETTLEMENT_COLOR_RECEIVES;
  ctx.fillText(toName, x + fromW + arrowW, y);
}

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

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const w = size;
  const h = size * 0.9;
  ctx.save();
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  drawRoundedRect(ctx, x, y, w, h, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + w - 3, y + 4);
  ctx.stroke();
  ctx.restore();
}

function drawClockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size * 0.42;
  const cx = x + size / 2;
  const cy = y + size / 2 + 1;
  ctx.save();
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.45, cy);
  ctx.stroke();
  ctx.restore();
}

function drawGeneratedOnSection(
  ctx: CanvasRenderingContext2D,
  innerX: number,
  y: number,
  innerW: number,
  data: SettlementShareData,
): number {
  const boxPad = 14;
  const boxH = 58;
  ctx.fillStyle = "#F9FAFB";
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, innerX, y, innerW, boxH, 14);
  ctx.fill();
  ctx.stroke();

  const iconSize = 13;
  const textX = innerX + boxPad + iconSize + 8;
  let rowY = y + 22;

  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "left";
  ctx.fillText("GENERATED ON", innerX + boxPad, y + 14);

  drawCalendarIcon(ctx, innerX + boxPad, rowY - 10, iconSize);
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText(data.generatedOnLabel, textX, rowY);

  rowY += 20;
  drawClockIcon(ctx, innerX + boxPad, rowY - 10, iconSize);
  ctx.fillStyle = "#6B7280";
  ctx.fillText(data.generatedAtLabel, textX, rowY);

  return y + boxH + 16;
}

function drawSettlementReportFooter(ctx: CanvasRenderingContext2D, width: number, y: number) {
  const centerX = width / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(SETTLEMENT_REPORT_FOOTER.poweredBy, centerX, y);
  ctx.font = "500 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(SETTLEMENT_REPORT_FOOTER.tagline, centerX, y + 14);
  ctx.fillText(SETTLEMENT_REPORT_FOOTER.url, centerX, y + 28);
  ctx.textAlign = "left";
}

function drawSettlementCard(
  ctx: CanvasRenderingContext2D,
  data: SettlementShareData,
  width: number,
  height: number,
  avatarImages: Map<string, HTMLImageElement>,
  logoImage: HTMLImageElement | null,
  fireNepalLogo: HTMLImageElement | null,
) {
  const pad = 36;
  const avatarSize = 42;
  const textX = pad + avatarSize + 14;
  const innerW = width - pad * 2;
  const cardInset = 14;
  const cardW = width - cardInset * 2;
  const cardH = height - cardInset * 2;

  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, cardInset, cardInset, cardW, cardH, 20);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardInset, cardInset, cardW, cardH, 20);
  ctx.stroke();

  const innerX = pad;
  let y = pad + 10;
  const contentRight = innerX + innerW;

  y = drawSettlementBrandingHeader(ctx, data, innerX, y, contentRight, logoImage, fireNepalLogo);

  y += 8;
  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.fillText("SETTLEMENT PERIOD", innerX, y);
  y += 16;
  ctx.font = "700 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText(data.monthLabel, innerX, y);
  y += 18;
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.fillText(data.currency, innerX, y);
  y += 24;

  y = drawGeneratedOnSection(ctx, innerX, y, innerW, data);

  drawDivider(ctx, innerX, y, innerW);
  y += 20;

  drawSectionTitle(ctx, innerX, y, "MEMBER SETTLEMENT BREAKDOWN");
  y += 24;

  for (const member of data.members) {
    const cardTop = y;
    const cardH = 102;
    drawMemberCard(ctx, innerX, cardTop, innerW, cardH);

    const rowTop = cardTop + 14;
    drawAvatar(ctx, innerX + 14, rowTop, avatarSize, member, avatarImages);

    const amountColor = memberRoleColor(member.role);
    const icon = memberRoleIcon(member.role);
    const nameText = icon ? `${icon} ${member.name}` : member.name;

    ctx.textAlign = "left";
    ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#111827";
    ctx.fillText(nameText, textX, rowTop + 18);
    y = rowTop + 36;

    const detailX = textX;
    const detailW = contentRight - detailX - 14;
    drawLabelAmountRow(ctx, "Paid:", member.paidLabel, detailX, y, detailW, "#6B7280", 12, 500);
    y += 18;
    drawLabelAmountRow(ctx, "Share:", member.shareLabel, detailX, y, detailW, "#6B7280", 12, 500);
    y += 18;
    drawLabelAmountRow(ctx, "Balance:", member.balanceLabel, detailX, y, detailW, amountColor, 12, 700);
    y = cardTop + cardH + 14;
  }

  y += 4;
  drawDivider(ctx, innerX, y, innerW);
  y += 20;

  drawSectionTitle(ctx, innerX, y, "FINAL TRANSFERS");
  y += 24;

  if (data.transfers.length === 0) {
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#10B981";
    ctx.fillText("All settled — no transfers needed", innerX, y);
    y += 24;
  } else {
    for (const transfer of data.transfers) {
      const transferCardH = 52;
      drawMemberCard(ctx, innerX, y, innerW, transferCardH);
      drawTransferNames(ctx, innerX + 14, y + 18, transfer.fromName, transfer.toName);
      ctx.textAlign = "right";
      ctx.font = "800 15px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "#111827";
      ctx.fillText(transfer.amountLabel, contentRight - 14, y + 38);
      ctx.textAlign = "left";
      y += transferCardH + 12;
    }
  }

  y += 4;
  drawDivider(ctx, innerX, y, innerW);
  y += 20;

  drawSectionTitle(ctx, innerX, y, "REPORT SUMMARY");
  y += 16;
  const summaryCardH = 88;
  drawMemberCard(ctx, innerX, y, innerW, summaryCardH);
  let summaryY = y + 22;
  const summaryPadX = innerX + 14;
  const summaryW = innerW - 28;

  drawLabelAmountRow(
    ctx,
    "Total Group Expense",
    data.totalGroupExpenseLabel,
    summaryPadX,
    summaryY,
    summaryW,
    "#111827",
    12,
  );
  summaryY += 22;
  drawLabelAmountRow(ctx, "Total Members", String(data.totalMembers), summaryPadX, summaryY, summaryW, "#111827", 12);
  summaryY += 22;
  drawLabelAmountRow(
    ctx,
    "Total Transfers",
    String(data.totalTransfers),
    summaryPadX,
    summaryY,
    summaryW,
    "#111827",
    12,
  );
  y += summaryCardH + 28;

  drawDivider(ctx, innerX, y, innerW);
  y += 24;
  drawSettlementReportFooter(ctx, width, y);
}

function settlementCardHeight(data: SettlementShareData): number {
  const pad = 36;
  let headerH = 168;
  if (data.hasGroupBranding) {
    headerH = 128;
    if (data.companyName) headerH += 24;
    if (data.roomNumber) headerH += 22;
    if (data.reportSubtitle) headerH += 24;
    if (data.logoUrl) headerH = Math.max(headerH, 128);
  }
  const dividerBlock = 20;
  const memberHeader = 24;
  const memberRowH = 116;
  const transferHeader = 24;
  const transferRowH = data.transfers.length === 0 ? 24 : data.transfers.length * 64;
  const footerH = 72;
  const summaryH = 116;
  const generatedOnH = 74;
  const dividers = dividerBlock * 4;
  const sections = memberHeader + transferHeader + summaryH + generatedOnH;

  return Math.min(
    2800,
    pad * 2 + headerH + dividers + sections + data.members.length * memberRowH + transferRowH + footerH + 32,
  );
}

async function createSettlementCardCanvas(data: SettlementShareData) {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const width = 720;
  const height = settlementCardHeight(data);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.scale(dpr, dpr);

  const avatarImages = await preloadMemberAvatars(data.members);
  const logoImage = await preloadGroupLogo(data.logoUrl);
  const fireNepalLogo = await preloadFireNepalLogo();
  drawSettlementCard(ctx, data, width, height, avatarImages, logoImage, fireNepalLogo);
  return canvas;
}

export async function settlementSharePngBlob(data: SettlementShareData): Promise<Blob> {
  const canvas = await createSettlementCardCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
      0.94,
    );
  });
}

export async function downloadSettlementSharePng(data: SettlementShareData, filename: string): Promise<void> {
  const blob = await settlementSharePngBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadSettlementSharePdf(data: SettlementShareData, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const canvas = await createSettlementCardCanvas(data);
  const imgData = canvas.toDataURL("image/png");
  const pxW = 720;
  const pxH = settlementCardHeight(data);
  const margin = 10;
  const pageW = 210;
  const pageH = 297;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  let drawW = maxW;
  let drawH = (pxH / pxW) * drawW;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = (pxW / pxH) * drawH;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.addImage(imgData, "PNG", margin, margin, drawW, drawH);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
