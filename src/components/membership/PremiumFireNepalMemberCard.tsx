"use client";

import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Crown,
  Flag,
  Globe2,
  Headphones,
  IdCard,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { forwardRef, useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { NepalChucheMapOutline } from "@/components/membership/NepalChucheMapOutline";
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

export const MEMBER_CARD_EXPORT_WIDTH = 1400;
export const MEMBER_CARD_EXPORT_HEIGHT = 900;

const EMPOWERMENT: Array<{ icon: typeof TrendingUp; text: string }> = [
  { icon: TrendingUp, text: "बजेट अझ राम्रो बनाउनुहोस्" },
  { icon: Clock3, text: "सम्पत्ति ट्र्याक गर्नुहोस्" },
  { icon: Target, text: "FIRE योजना बनाउनुहोस्" },
  { icon: Lightbulb, text: "AI वित्तीय कोच प्रयोग गर्नुहोस्" },
  { icon: Flag, text: "विश्वभरका नेपालीका लागि" },
];

type PremiumFireNepalMemberCardProps = {
  data: MemberCardData;
  /** Marks dedicated capture tree; artwork is identical for preview and export. */
  mode?: "preview" | "export";
};

const GOLD = "#D4AF37";
const GOLD_SOFT = "rgba(212,175,55,0.85)";
const GOLD_BRIGHT = "#F6E27A";
const EMERALD = "#10b981";
const EMERALD_SOFT = "#6ee7b7";

/** Photo diameter — +20% from prior 142px. */
const PHOTO_SIZE = 170;
/** QR outer frame — +30% from prior 138px. */
const QR_OUTER = 180;
const QR_INNER = 160;

function tierAccent(plan: FireMembershipTier) {
  if (plan === "elite") {
    return {
      label: tierBadgeLabel(plan),
      color: "#FFF6C8",
      border: "rgba(246,226,122,0.95)",
      bg: "linear-gradient(135deg, #5C4810 0%, #D4AF37 38%, #F6E27A 52%, #A67C1A 78%, #3A2A08 100%)",
      glow: "0 0 28px rgba(212,175,55,0.65), 0 0 8px rgba(246,226,122,0.5), inset 0 1px 0 rgba(255,246,200,0.55)",
      icon: Crown,
      iconSize: 22,
    };
  }
  if (plan === "premium") {
    return {
      label: tierBadgeLabel(plan),
      color: "#FFF8D6",
      border: "rgba(212,175,55,0.9)",
      bg: "linear-gradient(135deg, #3F3210 0%, #B8942A 36%, #E8C547 52%, #8A6A1C 80%, #1F1808 100%)",
      glow: "0 0 26px rgba(212,175,55,0.55), 0 0 8px rgba(232,197,71,0.4), inset 0 1px 0 rgba(255,248,214,0.45)",
      icon: Crown,
      iconSize: 20,
    };
  }
  return {
    label: tierBadgeLabel(plan),
    color: "#E4E4E7",
    border: "rgba(212,212,216,0.65)",
    bg: "linear-gradient(180deg, rgba(39,39,42,0.92), rgba(9,9,11,0.96))",
    glow: "0 0 18px rgba(161,161,170,0.3)",
    icon: Sparkles,
    iconSize: 18,
  };
}

function statusCopy(expiry: string | null) {
  const state = computeMembershipExpiryStatus(expiry);
  if (state.status === "expired") {
    return {
      value: "EXPIRED",
      sub: "Membership Expired · Renew now",
      valueColor: "#fecaca",
      border: "rgba(248,113,113,0.5)",
      bg: "rgba(127,29,29,0.35)",
    };
  }
  return {
    value: `${state.daysRemaining} Days Remaining`,
    sub: `Renews on ${formatMemberCardDate(expiry)}`,
    valueColor: "#ffffff",
    border: state.status === "expiring_soon" ? "rgba(251,191,36,0.45)" : "rgba(52,211,153,0.4)",
    bg: state.status === "expiring_soon" ? "rgba(120,53,15,0.35)" : "rgba(6,78,59,0.32)",
  };
}

function T({ style, children, className }: { style?: CSSProperties; children: ReactNode; className?: string }) {
  return (
    <p className={className} style={{ margin: 0, padding: 0, lineHeight: "normal", ...style }}>
      {children}
    </p>
  );
}

function FireEmblem() {
  return (
    <div
      style={{
        position: "relative",
        width: 236,
        height: 236,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(5,5,5,0) 68%)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 210,
          height: 210,
          borderRadius: 999,
          border: `2.5px solid ${GOLD_SOFT}`,
          boxShadow: `0 0 42px rgba(16,185,129,0.4), inset 0 0 32px rgba(16,185,129,0.22), 0 0 28px rgba(212,175,55,0.28)`,
          background:
            "radial-gradient(circle at 35% 28%, rgba(52,211,153,0.45), rgba(2,12,9,0.96) 62%, rgba(0,0,0,0.98) 100%)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 999,
            border: "1px solid rgba(110,231,183,0.32)",
          }}
        />
        <T
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            right: 18,
            textAlign: "center",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: GOLD_SOFT,
          }}
        >
          Financial Freedom
        </T>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={92}
          height={92}
          style={{
            width: 92,
            height: 92,
            borderRadius: 24,
            display: "block",
            boxShadow: "0 0 32px rgba(16,185,129,0.6)",
          }}
        />
        <T
          style={{
            position: "absolute",
            bottom: 18,
            left: 18,
            right: 18,
            textAlign: "center",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: GOLD_SOFT,
          }}
        >
          Better Life
        </T>
      </div>
    </div>
  );
}

export const PremiumFireNepalMemberCard = forwardRef<HTMLDivElement, PremiumFireNepalMemberCardProps>(
  function PremiumFireNepalMemberCard({ data, mode = "preview" }, ref) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const reactId = useId().replace(/:/g, "");
    const accent = tierAccent(data.membershipPlan);
    const TierIcon = accent.icon;
    const countdown = statusCopy(data.membershipExpiry);
    const verifyUrl = `${FIRE_NEPAL_CANONICAL_ORIGIN}/verify/${encodeURIComponent(data.fireNepalId)}`;
    const isExport = mode === "export";
    const initials = data.fullName.slice(0, 2).toUpperCase() || "FN";

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        if (!data.fireNepalId) return;
        try {
          const QRCode = (await import("qrcode")).default;
          const url = await QRCode.toDataURL(verifyUrl, {
            width: 364,
            margin: 1,
            errorCorrectionLevel: "H",
            color: { dark: "#043227", light: "#ffffff" },
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

    const detailRows: Array<{ icon: typeof CalendarDays; label: string; value: string; gold?: boolean }> = [
      { icon: CalendarDays, label: "Member Since", value: formatMemberCardDate(data.membershipStart) },
      { icon: CalendarDays, label: "Expiry Date", value: formatMemberCardDate(data.membershipExpiry) },
      { icon: Globe2, label: "Country of Work", value: data.countryOfWork ?? "" },
      { icon: Wallet, label: "Preferred Currency", value: currencyDisplay(data.preferredCurrency) },
      { icon: IdCard, label: "Membership Tier", value: tierDisplayName(data.membershipPlan), gold: data.membershipPlan === "elite" },
    ];

    return (
      <div
        ref={ref}
        data-member-card-root="true"
        data-member-card-export={isExport ? "true" : undefined}
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
          borderRadius: 26,
          color: "#ffffff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: "#030806",
          border: `2px solid ${GOLD}`,
          boxShadow: `
            0 0 0 1px rgba(246,226,122,0.35),
            0 0 28px rgba(212,175,55,0.35),
            0 28px 80px rgba(0,0,0,0.55)
          `,
        }}
      >
        {/* Master artwork backdrop — Himalaya + Nepal atmosphere */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/membership/card-backdrop.jpg"
          alt=""
          width={MEMBER_CARD_EXPORT_WIDTH}
          height={MEMBER_CARD_EXPORT_HEIGHT}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "72% 42%",
            display: "block",
          }}
        />

        {/* Himalayan depth + emerald / gold lighting (export-safe: no CSS blur filters) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              radial-gradient(ellipse 70% 55% at 78% 28%, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0) 62%),
              radial-gradient(ellipse 55% 45% at 18% 70%, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0) 58%),
              radial-gradient(ellipse 50% 40% at 55% 12%, rgba(110,231,183,0.16) 0%, rgba(2,6,4,0) 70%),
              linear-gradient(90deg, rgba(2,8,5,0.9) 0%, rgba(2,8,5,0.58) 32%, rgba(2,10,7,0.22) 58%, rgba(2,8,5,0.48) 100%),
              linear-gradient(180deg, rgba(2,10,7,0.34) 0%, rgba(2,8,5,0.1) 34%, rgba(2,8,5,0.48) 68%, rgba(0,0,0,0.88) 100%)
            `,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: "inset 0 0 100px rgba(16,185,129,0.1), inset 0 0 70px rgba(212,175,55,0.1)",
          }}
        />

        {/* Large glowing Nepal map watermark — low opacity luxury emboss */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "46%",
            width: 620,
            height: 340,
            marginLeft: -310,
            marginTop: -170,
            opacity: 0.14,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/membership/nepal-map-glow.png"
            alt=""
            width={620}
            height={340}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              opacity: 0.85,
            }}
          />
          <div style={{ position: "absolute", inset: "8% 12%", opacity: 0.9 }}>
            <NepalChucheMapOutline width={520} height={280} uid={`${reactId}-wm`} />
          </div>
        </div>

        {/* Inner gold hairline for double-border luxury feel */}
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: 22,
            border: "1px solid rgba(246,226,122,0.42)",
            pointerEvents: "none",
            zIndex: 2,
            boxShadow: "inset 0 0 40px rgba(212,175,55,0.06)",
          }}
        />

        {/* ─── Top brand row ─── */}
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 22,
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 3,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={50}
            height={50}
            style={{
              width: 50,
              height: 50,
              borderRadius: 15,
              display: "block",
              boxShadow: "0 0 24px rgba(16,185,129,0.5)",
            }}
          />
          <div>
            <T style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.1em", color: "#fff", lineHeight: "28px" }}>
              FIRE NEPAL
            </T>
            <T
              style={{
                marginTop: 2,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: GOLD_SOFT,
                lineHeight: "14px",
              }}
            >
              Financial Independence
            </T>
          </div>
        </div>

        <T
          className="font-nepali"
          style={{
            position: "absolute",
            left: 420,
            top: 30,
            width: 520,
            textAlign: "center",
            fontSize: 17,
            fontWeight: 800,
            color: "#f4f4f5",
            lineHeight: "26px",
            textShadow: "0 2px 16px rgba(0,0,0,0.65)",
            zIndex: 3,
          }}
        >
          <span style={{ color: "#ffffff" }}>आजै योजना बनाऔं, </span>
          <span style={{ color: EMERALD_SOFT }}>आर्थिक स्वतन्त्रता हासिल गरौं।</span>
        </T>

        {/* Elite / Premium luxury gold badge */}
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 22,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 22px",
            borderRadius: 12,
            border: `2px solid ${accent.border}`,
            background: accent.bg,
            color: accent.color,
            boxShadow: accent.glow,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            lineHeight: "18px",
            zIndex: 3,
          }}
        >
          <TierIcon size={accent.iconSize} strokeWidth={2.35} color={accent.color} />
          {accent.label}
        </div>

        {/* ─── Identity band ─── */}
        {/* Photo (+20%) */}
        <div style={{ position: "absolute", left: 36, top: 96, width: PHOTO_SIZE + 20, zIndex: 3 }}>
          <div
            style={{
              position: "relative",
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              borderRadius: 999,
              overflow: "hidden",
              border: `3.5px solid ${GOLD}`,
              background: "rgba(6,78,59,0.35)",
              boxShadow: `0 0 0 1px rgba(246,226,122,0.4), 0 0 42px rgba(212,175,55,0.42), 0 0 18px rgba(16,185,129,0.25)`,
            }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt=""
                width={PHOTO_SIZE}
                height={PHOTO_SIZE}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(145deg, #059669, #064e3b)",
                  fontSize: 40,
                  fontWeight: 900,
                  color: "#ecfdf5",
                }}
              >
                {initials}
              </div>
            )}
          </div>
          <span
            style={{
              position: "absolute",
              left: PHOTO_SIZE - 36,
              top: PHOTO_SIZE - 36,
              width: 40,
              height: 40,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: EMERALD,
              border: "2.5px solid rgba(236,253,245,0.95)",
              color: "#022c22",
              boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
            }}
          >
            <ShieldCheck size={20} strokeWidth={2.6} />
          </span>
          <div
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#d1fae5",
            }}
          >
            <BadgeCheck size={16} color={EMERALD_SOFT} />
            Verified Member
          </div>
        </div>

        {/* Name + ID + countdown */}
        <div style={{ position: "absolute", left: 236, top: 92, width: 720, zIndex: 3 }}>
          <T
            style={{
              fontSize: 68,
              fontWeight: 900,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#ffffff",
              lineHeight: "72px",
              whiteSpace: "normal",
              overflow: "visible",
              wordBreak: "break-word",
              textShadow: "0 3px 22px rgba(0,0,0,0.6), 0 0 40px rgba(16,185,129,0.15)",
            }}
          >
            {data.fullName}
          </T>

          <T
            style={{
              marginTop: 10,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: EMERALD_SOFT,
            }}
          >
            FIRE Nepal ID
          </T>
          <div
            style={{
              marginTop: 7,
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 26px",
              borderRadius: 999,
              border: "1.5px solid rgba(52,211,153,0.6)",
              background: "rgba(0,0,0,0.58)",
              boxShadow: "0 0 22px rgba(16,185,129,0.32), inset 0 0 20px rgba(16,185,129,0.14)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#ffffff",
            }}
          >
            {data.fireNepalId}
          </div>

          <div
            style={{
              marginTop: 12,
              width: 400,
              borderRadius: 16,
              border: `1.5px solid ${countdown.border}`,
              background: countdown.bg,
              padding: "14px 18px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={16} color={EMERALD_SOFT} />
              <T
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(236,253,245,0.92)",
                }}
              >
                Membership Countdown
              </T>
            </div>
            <T
              style={{
                marginTop: 6,
                fontSize: 48,
                fontWeight: 900,
                letterSpacing: "-0.025em",
                color: countdown.valueColor,
                lineHeight: "52px",
              }}
            >
              {countdown.value}
            </T>
            <T style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: EMERALD_SOFT }}>{countdown.sub}</T>
          </div>
        </div>

        {/* QR cluster — 30% larger with premium gold glow */}
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 88,
            width: 290,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            gap: 10,
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: 110,
              height: 62,
              marginTop: 58,
              flexShrink: 0,
            }}
          >
            <NepalChucheMapOutline width={110} height={62} uid={`${reactId}-qr`} />
          </div>
          <div style={{ width: QR_OUTER + 16, textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: QR_OUTER,
                height: QR_OUTER,
                margin: "0 auto",
                borderRadius: 18,
                padding: 10,
                boxSizing: "border-box",
                background: "#ffffff",
                border: `2.5px solid ${GOLD}`,
                boxShadow: `
                  0 0 0 2px rgba(246,226,122,0.45),
                  0 0 36px rgba(212,175,55,0.7),
                  0 0 18px rgba(246,226,122,0.55),
                  0 0 56px rgba(212,175,55,0.35),
                  0 0 24px rgba(16,185,129,0.2)
                `,
              }}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt=""
                  width={QR_INNER}
                  height={QR_INNER}
                  style={{ width: QR_INNER, height: QR_INNER, display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: QR_INNER,
                    height: QR_INNER,
                    display: "grid",
                    placeItems: "center",
                    background: "#f4f4f5",
                    color: "#71717a",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  QR
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 40,
                  height: 40,
                  marginLeft: -20,
                  marginTop: -20,
                  borderRadius: 11,
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
                  background: "#022c22",
                  display: "block",
                }}
              />
            </div>
            <T
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: GOLD_BRIGHT,
                textShadow: "0 0 16px rgba(212,175,55,0.55)",
              }}
            >
              Scan to verify
            </T>
            <T style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "rgba(244,244,245,0.85)", lineHeight: "16px" }}>
              Verify this membership at firenepal.com/verify
            </T>
          </div>
        </div>

        {/* Gold section divider — tighter to fill lower half */}
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: 388,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, transparent)`,
            boxShadow: "0 0 14px rgba(212,175,55,0.4)",
            zIndex: 3,
          }}
        />

        {/* ─── Bottom left: member details (fills lower half) ─── */}
        <div
          style={{
            position: "absolute",
            left: 36,
            top: 408,
            bottom: 58,
            width: 400,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <BadgeCheck size={18} color={EMERALD_SOFT} />
            <T
              style={{
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: EMERALD_SOFT,
              }}
            >
              Member Details
            </T>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid rgba(212,175,55,0.22)",
              background: "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(2,12,9,0.55))",
              boxShadow: "inset 0 0 28px rgba(16,185,129,0.06), 0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            {detailRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(52,211,153,0.4)",
                      background: "rgba(6,78,59,0.4)",
                      color: EMERALD_SOFT,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <T
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(161,161,170,0.98)",
                      }}
                    >
                      {row.label}
                    </T>
                    <T
                      style={{
                        marginTop: 3,
                        fontSize: 18,
                        fontWeight: 800,
                        color: row.gold ? GOLD : "#ffffff",
                        lineHeight: "24px",
                      }}
                    >
                      {row.value}
                    </T>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center emblem */}
        <div style={{ position: "absolute", left: 582, top: 448, width: 236, zIndex: 3 }}>
          <FireEmblem />
        </div>

        {/* Bottom right: benefits / empowerment (fills lower half) */}
        <div
          style={{
            position: "absolute",
            right: 36,
            top: 408,
            bottom: 58,
            width: 420,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <T
            style={{
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: EMERALD_SOFT,
              marginBottom: 14,
            }}
          >
            Membership Benefits
          </T>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 8,
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid rgba(212,175,55,0.22)",
              background: "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(2,12,9,0.55))",
              boxShadow: "inset 0 0 28px rgba(16,185,129,0.06), 0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, justifyContent: "space-evenly" }}>
              {EMPOWERMENT.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(16,185,129,0.2)",
                        border: "1px solid rgba(52,211,153,0.4)",
                        color: EMERALD_SOFT,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    <T
                      className="font-nepali"
                      style={{ fontSize: 17, fontWeight: 700, color: "rgba(236,253,245,0.96)", lineHeight: "24px" }}
                    >
                      {item.text}
                    </T>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(212,175,55,0.22)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <T
                  style={{
                    fontFamily: 'var(--font-signature), "Great Vibes", "Segoe Script", cursive',
                    fontSize: 36,
                    fontWeight: 400,
                    color: GOLD,
                    lineHeight: "40px",
                    textShadow: "0 0 18px rgba(212,175,55,0.4)",
                  }}
                >
                  FIRE Nepal
                </T>
                <T style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "rgba(244,244,245,0.8)", fontStyle: "italic" }}>
                  Thank you for being a part of our mission.
                </T>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/membership/holo-seal.png"
                alt=""
                width={64}
                height={64}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "contain",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 34px",
            borderTop: "1px solid rgba(212,175,55,0.32)",
            background: "rgba(0,0,0,0.78)",
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(209,250,229,0.9)",
            zIndex: 4,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Globe2 size={14} />
            www.firenepal.com
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#ecfdf5" }}>
            <Lock size={14} />
            Secure. Private. Trusted.
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Headphones size={14} />
            firenepal853@gmail.com
          </span>
        </div>
      </div>
    );
  },
);
