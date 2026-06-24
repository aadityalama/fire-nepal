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
const DIVIDER = "━━━━━━━━━━━━━━━━";

export const SETTLEMENT_COLOR_RECEIVES = "#059669";
export const SETTLEMENT_COLOR_PAYS = "#DC2626";
export const SETTLEMENT_COLOR_NEUTRAL = "#1e293b";
export const SETTLEMENT_COLOR_MUTED = "#64748b";

const REPORT_ROOM_BADGE_STYLE = { bg: "#d1fae5", text: "#047857", border: "#6ee7b7" };

export function normalizeSettlementSetting(value?: string | null): string {
  return value?.trim() ?? "";
}

const DEFAULT_SETTLEMENT_TITLE = "Roommate Settlement Summary";

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
    "Generated by FIRE Nepal",
    data.footerUrl,
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
    data.roomBadgeLabel ? `[${data.roomBadgeLabel}]` : "",
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
    "Generated with FIRE Nepal",
    data.footerUrl,
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
  ctx.strokeStyle = "#6ee7b7";
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
): number {
  const logoSize = 48;
  const textX = logo ? innerX + logoSize + 14 : innerX;
  let cursorY = y;

  if (logo) {
    drawGroupLogo(ctx, innerX, y - 2, logoSize, logo);
    cursorY = y + 4;
  }

  if (!data.hasGroupBranding) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#065f46";
    ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`🏠 ${DEFAULT_SETTLEMENT_TITLE}`, innerX, cursorY);
    if (data.roomBadgeLabel) {
      drawRoomBadge(ctx, data.roomBadgeLabel, contentRight, cursorY - 2);
    }
    return cursorY + 28;
  }

  ctx.textAlign = "left";
  if (data.companyName) {
    ctx.fillStyle = "#022c22";
    ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(data.companyName, textX, cursorY);
    cursorY += 26;
  }
  if (data.roomNumber) {
    ctx.fillStyle = "#047857";
    ctx.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Room ${data.roomNumber}`, textX, cursorY);
    cursorY += 22;
  }
  if (data.reportSubtitle) {
    cursorY += 6;
    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(data.reportSubtitle, textX, cursorY);
    cursorY += 18;
  }
  if (data.roomBadgeLabel) {
    drawRoomBadge(ctx, data.roomBadgeLabel, contentRight, y + 8);
  }
  return cursorY + 6;
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, x: number, y: number, title: string) {
  ctx.textAlign = "left";
  ctx.font = "700 11px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(title, x, y);
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
) {
  ctx.textAlign = "left";
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = "#64748b";
  ctx.fillText(label, x, y);
  ctx.textAlign = "right";
  ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
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

function drawRoomBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  rightX: number,
  centerY: number,
) {
  const style = REPORT_ROOM_BADGE_STYLE;
  ctx.font = "800 10px ui-sans-serif, system-ui, sans-serif";
  const textW = ctx.measureText(label).width;
  const padX = 10;
  const badgeW = textW + padX * 2;
  const badgeH = 22;
  const x = rightX - badgeW;
  const y = centerY - badgeH / 2;

  ctx.fillStyle = style.bg;
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x, y, badgeW, badgeH, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + badgeW / 2, centerY);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawSettlementCard(
  ctx: CanvasRenderingContext2D,
  data: SettlementShareData,
  width: number,
  height: number,
  avatarImages: Map<string, HTMLImageElement>,
  logoImage: HTMLImageElement | null,
) {
  const pad = 36;
  const avatarSize = 36;
  const textX = pad + avatarSize + 12;
  const innerW = width - 48 - pad * 2;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#064e3b");
  bg.addColorStop(1, "#047857");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cardX = 24;
  const cardY = 24;
  const cardW = width - 48;
  const cardH = height - 48;
  const r = 24;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 50, 30, 0.25)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.moveTo(cardX + r, cardY);
  ctx.lineTo(cardX + cardW - r, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
  ctx.lineTo(cardX + cardW, cardY + cardH - r);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
  ctx.lineTo(cardX + r, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
  ctx.lineTo(cardX, cardY + r);
  ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";

  const innerX = cardX + pad;
  let y = cardY + pad + 6;
  const contentRight = innerX + innerW;

  y = drawSettlementBrandingHeader(ctx, data, innerX, y, contentRight, logoImage);

  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SETTLEMENT PERIOD", innerX, y);
  y += 16;
  ctx.font = "700 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#064e3b";
  ctx.fillText(data.monthLabel, innerX, y);
  y += 22;

  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("GENERATED ON", innerX, y);
  y += 16;
  ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(data.generatedOnLabel, innerX, y);
  y += 16;
  ctx.fillText(data.generatedAtLabel, innerX, y);
  y += 20;

  drawDivider(ctx, innerX, y, innerW);
  y += 18;

  drawSectionTitle(ctx, innerX, y, "MEMBER SETTLEMENT BREAKDOWN");
  y += 22;

  for (const member of data.members) {
    const rowTop = y - 10;
    drawAvatar(ctx, innerX, rowTop, avatarSize, member, avatarImages);

    const amountColor = memberRoleColor(member.role);
    const icon = memberRoleIcon(member.role);
    const nameText = icon ? `${icon} ${member.name}` : member.name;

    ctx.textAlign = "left";
    ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = amountColor;
    ctx.fillText(nameText, textX, y + 4);
    y += 20;

    const detailX = textX;
    const detailW = contentRight - detailX;
    drawLabelAmountRow(ctx, "Paid:", member.paidLabel, detailX, y, detailW, amountColor);
    y += 18;
    drawLabelAmountRow(ctx, "Share:", member.shareLabel, detailX, y, detailW, amountColor);
    y += 18;
    drawLabelAmountRow(ctx, "Balance:", member.balanceLabel, detailX, y, detailW, amountColor);
    y += 22;
  }

  y += 4;
  drawDivider(ctx, innerX, y, innerW);
  y += 18;

  drawSectionTitle(ctx, innerX, y, "FINAL TRANSFERS");
  y += 22;

  if (data.transfers.length === 0) {
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#047857";
    ctx.fillText("All settled — no transfers needed", innerX, y);
    y += 24;
  } else {
    for (const transfer of data.transfers) {
      drawTransferNames(ctx, innerX, y, transfer.fromName, transfer.toName);
      y += 18;
      ctx.textAlign = "right";
      ctx.font = "800 15px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = SETTLEMENT_COLOR_NEUTRAL;
      ctx.fillText(transfer.amountLabel, contentRight, y);
      ctx.textAlign = "left";
      y += 22;
    }
  }

  y += 4;
  drawDivider(ctx, innerX, y, innerW);
  y += 18;

  drawSectionTitle(ctx, innerX, y, "REPORT SUMMARY");
  y += 22;

  drawLabelAmountRow(
    ctx,
    "Total Group Expense",
    data.totalGroupExpenseLabel,
    innerX,
    y,
    innerW,
    "#064e3b",
    12,
  );
  y += 22;
  drawLabelAmountRow(ctx, "Total Members", String(data.totalMembers), innerX, y, innerW, "#064e3b", 12);
  y += 22;
  drawLabelAmountRow(
    ctx,
    "Total Transfers",
    String(data.totalTransfers),
    innerX,
    y,
    innerW,
    "#064e3b",
    12,
  );
  y += 30;

  ctx.textAlign = "center";
  ctx.font = "700 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Generated by FIRE Nepal", cardX + cardW / 2, cardY + cardH - pad - 6);
  ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(data.footerUrl, cardX + cardW / 2, cardY + cardH - pad + 8);
}

function settlementCardHeight(data: SettlementShareData): number {
  const pad = 36;
  let headerH = 148;
  if (data.hasGroupBranding) {
    headerH = 108;
    if (data.companyName) headerH += 24;
    if (data.roomNumber) headerH += 22;
    if (data.reportSubtitle) headerH += 24;
    if (data.logoUrl) headerH = Math.max(headerH, 120);
  }
  const dividerBlock = 18;
  const memberHeader = 22;
  const memberRowH = 88;
  const transferHeader = 22;
  const transferRowH = data.transfers.length === 0 ? 24 : data.transfers.length * 40;
  const footerH = 88;
  const summaryH = 88;
  const dividers = dividerBlock * 3;
  const sections = memberHeader + transferHeader + summaryH;

  return Math.min(
    2600,
    48 + pad * 2 + headerH + dividers + sections + data.members.length * memberRowH + transferRowH + footerH,
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
  drawSettlementCard(ctx, data, width, height, avatarImages, logoImage);
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
