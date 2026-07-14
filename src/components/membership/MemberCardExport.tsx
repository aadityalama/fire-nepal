"use client";

import { BadgeCheck, Crown, Flame, Gem, Globe2, Headphones, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { forwardRef, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import type { FireMembershipTier } from "@/lib/fire-membership";
import {
  computeMembershipExpiryStatus,
  currencyDisplay,
  formatMemberCardDate,
  tierBadgeLabel,
  tierDisplayName,
  type MemberCardData,
} from "@/lib/member-card-profile";

/** Canonical membership card export size — never scale this surface. */
export const MEMBER_CARD_EXPORT_WIDTH = 1400;
export const MEMBER_CARD_EXPORT_HEIGHT = 900;

/** Section heights must sum to exactly 900 — no overflow, no dead band. */
const HERO_HEIGHT = 420;
const FOOTER_HEIGHT = 52;
const BODY_HEIGHT = MEMBER_CARD_EXPORT_HEIGHT - HERO_HEIGHT - FOOTER_HEIGHT; // 428

const BENEFITS = [
  "Budget smarter",
  "Track wealth",
  "FIRE Planning",
  "AI Financial Coach",
  "Secure & Verified",
  "Built for Nepalis Worldwide",
] as const;

const NEPALI_SLOGAN = ["आजै योजना बनाऔं,", "आर्थिक स्वतन्त्रता हासिल गरौं।"];

const TEXT: CSSProperties = {
  lineHeight: "normal",
  margin: 0,
  padding: 0,
};

type MemberCardExportProps = {
  data: MemberCardData;
};

function tierAccent(plan: FireMembershipTier) {
  if (plan === "elite") {
    return {
      badgeBg: "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(253,224,71,0.88), rgba(245,158,11,0.95))",
      badgeColor: "#451a03",
      badgeBorder: "rgba(253,230,138,0.7)",
      glow: "0 0 40px rgba(245,158,11,0.35)",
      icon: Crown,
    };
  }
  if (plan === "premium") {
    return {
      badgeBg: "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(190,242,100,0.75), rgba(16,185,129,0.95))",
      badgeColor: "#022c22",
      badgeBorder: "rgba(167,243,208,0.6)",
      glow: "0 0 36px rgba(16,185,129,0.32)",
      icon: Gem,
    };
  }
  return {
    badgeBg: "linear-gradient(90deg, rgba(212,212,216,0.9), rgba(228,228,231,0.8), rgba(161,161,170,0.9))",
    badgeColor: "#18181b",
    badgeBorder: "rgba(212,212,216,0.6)",
    glow: "0 0 28px rgba(161,161,170,0.25)",
    icon: Sparkles,
  };
}

function statusPanel(expiry: string | null) {
  const state = computeMembershipExpiryStatus(expiry);

  if (state.status === "expired") {
    return {
      label: "Status",
      value: "EXPIRED",
      sub: "Membership Expired",
      action: "Renew Membership",
      bg: "rgba(239,68,68,0.22)",
      border: "rgba(248,113,113,0.5)",
      valueColor: "#fecaca",
    };
  }

  if (state.status === "expiring_soon") {
    return {
      label: "Membership countdown",
      value: `${state.daysRemaining} Days Remaining`,
      sub: `Renews on ${formatMemberCardDate(expiry)}`,
      action: null as string | null,
      bg: "rgba(245,158,11,0.2)",
      border: "rgba(251,191,36,0.45)",
      valueColor: "#fffbeb",
    };
  }

  return {
    label: "Membership countdown",
    value: `${state.daysRemaining} Days Remaining`,
    sub: `Renews on ${formatMemberCardDate(expiry)}`,
    action: null as string | null,
    bg: "rgba(16,185,129,0.18)",
    border: "rgba(52,211,153,0.4)",
    valueColor: "#ffffff",
  };
}

function SolidPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.55)",
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MemberCardMountains() {
  return (
    <svg
      width={MEMBER_CARD_EXPORT_WIDTH}
      height={HERO_HEIGHT}
      viewBox={`0 0 ${MEMBER_CARD_EXPORT_WIDTH} ${HERO_HEIGHT}`}
      style={{ position: "absolute", inset: 0, display: "block" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="mcx-sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#031612" />
          <stop offset="45%" stopColor="#06281f" />
          <stop offset="100%" stopColor="#010807" />
        </linearGradient>
        <linearGradient id="mcx-mtn" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#145f4b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#02120e" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="mcx-glow" cx="72%" cy="38%" r="28%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={MEMBER_CARD_EXPORT_WIDTH} height={HERO_HEIGHT} fill="url(#mcx-sky)" />
      <rect width={MEMBER_CARD_EXPORT_WIDTH} height={HERO_HEIGHT} fill="url(#mcx-glow)" />
      <path
        d={`M0 318 L120 248 L220 288 L340 178 L470 258 L590 148 L720 238 L860 118 L1020 218 L1180 158 L1400 278 L1400 ${HERO_HEIGHT} L0 ${HERO_HEIGHT} Z`}
        fill="url(#mcx-mtn)"
        opacity="0.9"
      />
      <path
        d={`M0 358 L180 298 L300 338 L460 248 L640 328 L820 238 L980 308 L1160 258 L1400 338 L1400 ${HERO_HEIGHT} L0 ${HERO_HEIGHT} Z`}
        fill="#031612"
        opacity="0.85"
      />
      <path
        d="M860 95 C900 70 940 72 980 95 C1010 112 1035 145 1045 180 C1020 165 990 158 960 165 C920 175 885 165 860 145 Z"
        fill="none"
        stroke="#34d399"
        strokeWidth="3"
        opacity="0.75"
      />
    </svg>
  );
}

function MemberCardTempleSilhouette() {
  return (
    <svg
      width={MEMBER_CARD_EXPORT_WIDTH}
      height={88}
      viewBox="0 0 1400 88"
      style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.35, display: "block" }}
      aria-hidden
    >
      <path
        d="M0 88 L0 54 L40 54 L55 28 L70 54 L110 54 L125 20 L140 54 L180 54 L200 12 L220 54 L260 54 L280 24 L300 54 L340 54 L360 16 L380 54 L420 54 L440 32 L460 54 L500 54 L520 10 L540 54 L580 54 L600 26 L620 54 L660 54 L680 14 L700 54 L740 54 L760 30 L780 54 L820 54 L840 6 L860 54 L900 54 L920 28 L940 54 L980 54 L1000 18 L1020 54 L1060 54 L1080 34 L1100 54 L1140 54 L1160 12 L1180 54 L1220 54 L1240 26 L1260 54 L1300 54 L1320 22 L1340 54 L1400 54 L1400 88 Z"
        fill="#d4af37"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Dedicated PNG/PDF export surface.
 * Fixed 1400×900 — no responsive wrappers, transforms, scale, zoom, sticky, or backdrop-filter.
 */
export const MemberCardExport = forwardRef<HTMLDivElement, MemberCardExportProps>(
  function MemberCardExport({ data }, ref) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const panel = statusPanel(data.membershipExpiry);
    const accent = tierAccent(data.membershipPlan);
    const TierIcon = accent.icon;
    const verifyUrl = `${FIRE_NEPAL_CANONICAL_ORIGIN}/verify/${encodeURIComponent(data.fireNepalId)}`;
    const initials = data.fullName.slice(0, 2).toUpperCase() || "FN";

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        if (!data.fireNepalId) return;
        try {
          const QRCode = (await import("qrcode")).default;
          const url = await QRCode.toDataURL(verifyUrl, {
            width: 220,
            margin: 1,
            color: { dark: "#064e3b", light: "#ffffff" },
          });
          if (!cancelled) setQrDataUrl(url);
        } catch {
          if (!cancelled) setQrDataUrl(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [data.fireNepalId, verifyUrl]);

    const detailRows: Array<[string, string]> = [
      ["Member Since", formatMemberCardDate(data.membershipStart)],
      ["Expiry Date", formatMemberCardDate(data.membershipExpiry)],
      ["Country of Work", data.countryOfWork ?? ""],
      ["Preferred Currency", currencyDisplay(data.preferredCurrency)],
      ["Membership Tier", tierDisplayName(data.membershipPlan)],
      ["Phone Number", data.phone ?? ""],
      ["Email", data.email ?? ""],
    ];

    return (
      <div
        ref={ref}
        data-member-card-root="true"
        data-member-card-export="true"
        data-export-ready={qrDataUrl ? "true" : "false"}
        style={{
          position: "relative",
          boxSizing: "border-box",
          width: MEMBER_CARD_EXPORT_WIDTH,
          height: MEMBER_CARD_EXPORT_HEIGHT,
          minWidth: MEMBER_CARD_EXPORT_WIDTH,
          maxWidth: MEMBER_CARD_EXPORT_WIDTH,
          minHeight: MEMBER_CARD_EXPORT_HEIGHT,
          maxHeight: MEMBER_CARD_EXPORT_HEIGHT,
          overflow: "hidden",
          borderRadius: 28,
          border: "2px solid rgba(252,211,77,0.7)",
          background: "#050505",
          color: "#ffffff",
          fontFamily: "inherit",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        {/* Hero: brand + photo + name/ID/countdown + QR — fixed pixels */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: MEMBER_CARD_EXPORT_WIDTH,
            height: HERO_HEIGHT,
            overflow: "hidden",
            borderBottom: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <MemberCardMountains />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.08), transparent 28%), linear-gradient(180deg, rgba(5,5,5,0.05), rgba(5,5,5,0.55))",
              pointerEvents: "none",
            }}
          />

          {/* Brand — top left */}
          <div style={{ position: "absolute", left: 40, top: 28, display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={48}
              height={48}
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: "block",
                boxShadow: "0 0 24px rgba(16,185,129,0.35)",
              }}
            />
            <div>
              <p style={{ ...TEXT, fontSize: 24, fontWeight: 900, letterSpacing: "0.08em", color: "#ffffff", lineHeight: "30px" }}>
                FIRE NEPAL
              </p>
              <p
                style={{
                  ...TEXT,
                  marginTop: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                  color: "rgba(253,230,138,0.85)",
                  lineHeight: "16px",
                }}
              >
                Financial Independence
              </p>
            </div>
          </div>

          {/* Tier badge — top right, above QR */}
          <div
            style={{
              position: "absolute",
              right: 40,
              top: 28,
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: `1px solid ${accent.badgeBorder}`,
              background: accent.badgeBg,
              color: accent.badgeColor,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              lineHeight: "16px",
              boxShadow: accent.glow,
            }}
          >
            <TierIcon size={16} strokeWidth={2.5} />
            {tierBadgeLabel(data.membershipPlan)}
          </div>

          {/* Photo — left, aligned with name/QR row */}
          <div style={{ position: "absolute", left: 40, top: 118, width: 148 }}>
            <div
              style={{
                position: "relative",
                width: 144,
                height: 144,
                borderRadius: 999,
                overflow: "hidden",
                border: "3px solid rgba(252,211,77,0.75)",
                background: "rgba(6,78,59,0.3)",
                boxShadow: "0 0 40px rgba(245,158,11,0.22)",
              }}
            >
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatarUrl}
                  alt=""
                  width={144}
                  height={144}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #059669, #064e3b)",
                    fontSize: 30,
                    fontWeight: 900,
                    color: "#ecfdf5",
                    lineHeight: "36px",
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
            <span
              style={{
                position: "absolute",
                left: 108,
                top: 108,
                width: 36,
                height: 36,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(110,231,183,0.5)",
                background: "#10b981",
                color: "#022c22",
                boxShadow: "0 8px 16px rgba(0,0,0,0.35)",
              }}
            >
              <BadgeCheck size={18} strokeWidth={2.8} />
            </span>
            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                border: "1px solid rgba(52,211,153,0.3)",
                background: "rgba(16,185,129,0.2)",
                padding: "5px 12px",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#d1fae5",
                lineHeight: "14px",
              }}
            >
              <ShieldCheck size={12} />
              Verified Member
            </div>
          </div>

          {/* Name + ID + countdown — center-left, never under QR */}
          <div style={{ position: "absolute", left: 220, top: 116, width: 760 }}>
            <h2
              style={{
                ...TEXT,
                boxSizing: "content-box",
                width: "100%",
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#ffffff",
                lineHeight: "48px",
                minHeight: 48,
                overflow: "visible",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {data.fullName}
            </h2>

            <SolidPanel
              style={{
                marginTop: 16,
                width: 320,
                padding: "14px 16px",
                borderColor: "rgba(52,211,153,0.25)",
              }}
            >
              <p
                style={{
                  ...TEXT,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(110,231,183,0.85)",
                  lineHeight: "16px",
                }}
              >
                FIRE Nepal ID
              </p>
              <p
                style={{
                  ...TEXT,
                  marginTop: 8,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  color: "#ffffff",
                  lineHeight: "28px",
                }}
              >
                {data.fireNepalId}
              </p>
            </SolidPanel>

            <SolidPanel
              style={{
                marginTop: 14,
                width: 400,
                padding: "14px 16px",
                background: panel.bg,
                borderColor: panel.border,
              }}
            >
              <p
                style={{
                  ...TEXT,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: "16px",
                }}
              >
                {panel.label}
              </p>
              <p
                style={{
                  ...TEXT,
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: panel.valueColor,
                  lineHeight: "36px",
                }}
              >
                {panel.value}
              </p>
              <p
                style={{
                  ...TEXT,
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: "20px",
                }}
              >
                {panel.sub}
              </p>
              {panel.action ? (
                <p
                  style={{
                    ...TEXT,
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#fecaca",
                    lineHeight: "16px",
                  }}
                >
                  {panel.action}
                </p>
              ) : null}
            </SolidPanel>
          </div>

          {/* QR — top-right column under tier badge, aligned with photo top */}
          <div style={{ position: "absolute", left: 1200, top: 118, width: 160, textAlign: "center" }}>
            {qrDataUrl ? (
              <div
                style={{
                  width: 148,
                  height: 148,
                  margin: "0 auto",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "#ffffff",
                  padding: 8,
                  boxSizing: "border-box",
                  boxShadow: "0 0 30px rgba(16,185,129,0.18)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt=""
                  width={132}
                  height={132}
                  style={{ width: 132, height: 132, display: "block" }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 148,
                  height: 148,
                  margin: "0 auto",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#a1a1aa",
                  lineHeight: "16px",
                }}
              >
                QR loading
              </div>
            )}
            <p
              style={{
                ...TEXT,
                marginTop: 12,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(209,250,229,0.85)",
                lineHeight: "14px",
              }}
            >
              Scan to verify
            </p>
            <p
              style={{
                ...TEXT,
                marginTop: 4,
                fontSize: 10,
                fontWeight: 600,
                color: "#a1a1aa",
                lineHeight: "14px",
              }}
            >
              Verify this membership at firenepal.com/verify
            </p>
          </div>
        </div>

        {/* Body: three filled columns — details | emblem | benefits */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: HERO_HEIGHT,
            width: MEMBER_CARD_EXPORT_WIDTH,
            height: BODY_HEIGHT,
            overflow: "hidden",
          }}
        >
          <MemberCardTempleSilhouette />

          {/* Details column */}
          <div style={{ position: "absolute", left: 40, top: 20, width: 420, height: BODY_HEIGHT - 28 }}>
            <p
              style={{
                ...TEXT,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(110,231,183,0.85)",
                lineHeight: "16px",
              }}
            >
              <BadgeCheck size={14} />
              Member Details
            </p>
            <SolidPanel
              style={{
                marginTop: 10,
                height: BODY_HEIGHT - 64,
                boxSizing: "border-box",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {detailRows.map(([label, value], index) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    borderBottom: index === detailRows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
                    paddingBottom: index === detailRows.length - 1 ? 0 : 6,
                    paddingTop: index === 0 ? 0 : 6,
                  }}
                >
                  <span
                    style={{
                      ...TEXT,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#a1a1aa",
                      lineHeight: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      ...TEXT,
                      maxWidth: "58%",
                      textAlign: "right",
                      fontSize: 14,
                      fontWeight: 900,
                      color: "#ffffff",
                      lineHeight: "20px",
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </SolidPanel>
          </div>

          {/* Emblem — vertically centered in body */}
          <div
            style={{
              position: "absolute",
              left: 510,
              top: Math.round((BODY_HEIGHT - 200) / 2),
              width: 380,
              height: 200,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 70,
                top: 0,
                width: 240,
                height: 200,
                borderRadius: 999,
                background: "radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(5,5,5,0) 70%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 90,
                top: 0,
                width: 200,
                height: 200,
                borderRadius: 999,
                border: "1px solid rgba(252,211,77,0.35)",
                background: "radial-gradient(circle at 30% 20%, rgba(52,211,153,0.35), rgba(5,5,5,0.92) 68%)",
                boxShadow: "0 0 50px rgba(16,185,129,0.28)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: 14,
                  right: 14,
                  bottom: 14,
                  borderRadius: 999,
                  border: "1px solid rgba(110,231,183,0.2)",
                }}
              />
              <Flame style={{ width: 72, height: 72, color: "#6ee7b7", filter: "none" }} fill="currentColor" />
              <p
                style={{
                  ...TEXT,
                  position: "absolute",
                  top: 16,
                  left: 8,
                  right: 8,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(253,230,138,0.9)",
                  lineHeight: "14px",
                }}
              >
                Financial Freedom
              </p>
              <p
                style={{
                  ...TEXT,
                  position: "absolute",
                  bottom: 16,
                  left: 8,
                  right: 8,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(253,230,138,0.9)",
                  lineHeight: "14px",
                }}
              >
                Better Life
              </p>
            </div>
          </div>

          {/* Benefits column */}
          <div style={{ position: "absolute", right: 40, top: 20, width: 420, height: BODY_HEIGHT - 28 }}>
            <SolidPanel
              style={{
                padding: "14px 16px",
                background: "rgba(6,78,59,0.28)",
                borderColor: "rgba(52,211,153,0.15)",
              }}
            >
              <p
                className="font-nepali"
                style={{
                  ...TEXT,
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#d1fae5",
                  lineHeight: "28px",
                }}
              >
                {NEPALI_SLOGAN[0]}
                <span style={{ display: "block", color: "#6ee7b7", lineHeight: "28px" }}>{NEPALI_SLOGAN[1]}</span>
              </p>
            </SolidPanel>

            <p
              style={{
                ...TEXT,
                marginTop: 14,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(110,231,183,0.85)",
                lineHeight: "16px",
              }}
            >
              Benefits
            </p>
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(236,253,245,0.9)",
                    lineHeight: "20px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "#34d399",
                      flexShrink: 0,
                    }}
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            <p
              style={{
                ...TEXT,
                marginTop: 4,
                fontSize: 14,
                fontWeight: 600,
                fontStyle: "italic",
                color: "rgba(253,230,138,0.85)",
                lineHeight: "20px",
              }}
            >
              Thank you for being a part of our mission.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: HERO_HEIGHT + BODY_HEIGHT,
            width: MEMBER_CARD_EXPORT_WIDTH,
            height: FOOTER_HEIGHT,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.7)",
            padding: "0 40px",
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(209,250,229,0.85)",
            lineHeight: "16px",
          }}
        >
          <p style={{ ...TEXT, display: "flex", alignItems: "center", gap: 8, lineHeight: "16px" }}>
            <Globe2 size={14} />
            www.firenepal.com
          </p>
          <p style={{ ...TEXT, display: "flex", alignItems: "center", gap: 8, color: "#ecfdf5", lineHeight: "16px" }}>
            <Lock size={14} />
            Secure. Private. Trusted.
          </p>
          <p style={{ ...TEXT, display: "flex", alignItems: "center", gap: 8, lineHeight: "16px" }}>
            <Headphones size={14} />
            firenepal853@gmail.com
          </p>
        </div>
      </div>
    );
  },
);
