"use client";

import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Crown,
  Flag,
  Gem,
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
const EMERALD = "#10b981";
const EMERALD_SOFT = "#6ee7b7";

function tierAccent(plan: FireMembershipTier) {
  if (plan === "elite") {
    return {
      label: tierBadgeLabel(plan),
      color: "#F6E27A",
      border: "rgba(246,226,122,0.85)",
      bg: "linear-gradient(180deg, rgba(58,42,8,0.92), rgba(20,14,4,0.96))",
      glow: "0 0 22px rgba(212,175,55,0.45)",
      icon: Crown,
    };
  }
  if (plan === "premium") {
    return {
      label: tierBadgeLabel(plan),
      color: "#A7F3D0",
      border: "rgba(52,211,153,0.75)",
      bg: "linear-gradient(180deg, rgba(6,78,59,0.92), rgba(2,30,22,0.96))",
      glow: "0 0 22px rgba(16,185,129,0.4)",
      icon: Gem,
    };
  }
  return {
    label: tierBadgeLabel(plan),
    color: "#E4E4E7",
    border: "rgba(212,212,216,0.65)",
    bg: "linear-gradient(180deg, rgba(39,39,42,0.92), rgba(9,9,11,0.96))",
    glow: "0 0 18px rgba(161,161,170,0.3)",
    icon: Sparkles,
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
        width: 220,
        height: 220,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(16,185,129,0.45) 0%, rgba(5,5,5,0) 68%)",
          filter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 196,
          height: 196,
          borderRadius: 999,
          border: `2px solid ${GOLD_SOFT}`,
          boxShadow: `0 0 36px rgba(16,185,129,0.35), inset 0 0 28px rgba(16,185,129,0.2), 0 0 24px rgba(212,175,55,0.22)`,
          background:
            "radial-gradient(circle at 35% 28%, rgba(52,211,153,0.4), rgba(2,12,9,0.96) 62%, rgba(0,0,0,0.98) 100%)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 999,
            border: "1px solid rgba(110,231,183,0.28)",
          }}
        />
        <T
          style={{
            position: "absolute",
            top: 16,
            left: 18,
            right: 18,
            textAlign: "center",
            fontSize: 10,
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
          width={86}
          height={86}
          style={{
            width: 86,
            height: 86,
            borderRadius: 22,
            display: "block",
            boxShadow: "0 0 28px rgba(16,185,129,0.55)",
          }}
        />
        <T
          style={{
            position: "absolute",
            bottom: 16,
            left: 18,
            right: 18,
            textAlign: "center",
            fontSize: 10,
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
            width: 280,
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
          background: "#050806",
          border: `2px solid ${GOLD}`,
          boxShadow: `
            0 0 0 1px rgba(246,226,122,0.35),
            0 0 28px rgba(212,175,55,0.35),
            0 28px 80px rgba(0,0,0,0.55)
          `,
        }}
      >
        {/* Master artwork backdrop — realistic Himalaya + Nepal map + topo + pagodas */}
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

        {/* Depth / readability gradients — preserve premium lighting, do not flatten art */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              linear-gradient(90deg, rgba(2,6,4,0.88) 0%, rgba(2,6,4,0.62) 34%, rgba(2,6,4,0.18) 62%, rgba(2,6,4,0.42) 100%),
              linear-gradient(180deg, rgba(2,6,4,0.28) 0%, rgba(2,6,4,0.08) 38%, rgba(2,6,4,0.55) 72%, rgba(0,0,0,0.82) 100%)
            `,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: "inset 0 0 80px rgba(212,175,55,0.08)",
          }}
        />

        {/* Inner gold hairline for double-border luxury feel */}
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: 22,
            border: "1px solid rgba(246,226,122,0.38)",
            pointerEvents: "none",
          }}
        />

        {/* ─── Top brand row ─── */}
        <div style={{ position: "absolute", left: 34, top: 26, display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={46}
            height={46}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              display: "block",
              boxShadow: "0 0 22px rgba(16,185,129,0.45)",
            }}
          />
          <div>
            <T style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.1em", color: "#fff", lineHeight: "26px" }}>
              FIRE NEPAL
            </T>
            <T
              style={{
                marginTop: 2,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.34em",
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
            left: 430,
            top: 34,
            width: 540,
            textAlign: "center",
            fontSize: 18,
            fontWeight: 800,
            color: "#f4f4f5",
            lineHeight: "28px",
            textShadow: "0 2px 16px rgba(0,0,0,0.65)",
          }}
        >
          <span style={{ color: "#ffffff" }}>आजै योजना बनाऔं, </span>
          <span style={{ color: EMERALD_SOFT }}>आर्थिक स्वतन्त्रता हासिल गरौं।</span>
        </T>

        <div
          style={{
            position: "absolute",
            right: 34,
            top: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 10,
            border: `1.5px solid ${accent.border}`,
            background: accent.bg,
            color: accent.color,
            boxShadow: accent.glow,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            lineHeight: "14px",
          }}
        >
          <TierIcon size={15} strokeWidth={2.4} color={accent.color} />
          {accent.label}
        </div>

        {/* ─── Identity band ─── */}
        {/* Photo */}
        <div style={{ position: "absolute", left: 42, top: 112, width: 156 }}>
          <div
            style={{
              position: "relative",
              width: 142,
              height: 142,
              borderRadius: 999,
              overflow: "hidden",
              border: `3px solid ${GOLD}`,
              background: "rgba(6,78,59,0.35)",
              boxShadow: `0 0 0 1px rgba(246,226,122,0.35), 0 0 34px rgba(212,175,55,0.35)`,
            }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt=""
                width={142}
                height={142}
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
                  fontSize: 34,
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
              left: 108,
              top: 108,
              width: 34,
              height: 34,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: EMERALD,
              border: "2px solid rgba(236,253,245,0.9)",
              color: "#022c22",
              boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
            }}
          >
            <ShieldCheck size={17} strokeWidth={2.6} />
          </span>
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#d1fae5",
            }}
          >
            <BadgeCheck size={14} color={EMERALD_SOFT} />
            Verified Member
          </div>
        </div>

        {/* Name + ID + countdown */}
        <div style={{ position: "absolute", left: 230, top: 118, width: 620 }}>
          <T
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#ffffff",
              lineHeight: "40px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 2px 18px rgba(0,0,0,0.55)",
            }}
          >
            {data.fullName}
          </T>

          <T
            style={{
              marginTop: 14,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: EMERALD_SOFT,
            }}
          >
            FIRE Nepal ID
          </T>
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(52,211,153,0.55)",
              background: "rgba(0,0,0,0.55)",
              boxShadow: "0 0 18px rgba(16,185,129,0.28), inset 0 0 18px rgba(16,185,129,0.12)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#ffffff",
            }}
          >
            {data.fireNepalId}
          </div>

          <div
            style={{
              marginTop: 16,
              width: 360,
              borderRadius: 16,
              border: `1px solid ${countdown.border}`,
              background: countdown.bg,
              padding: "14px 16px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={15} color={EMERALD_SOFT} />
              <T
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(236,253,245,0.9)",
                }}
              >
                Membership Countdown
              </T>
            </div>
            <T
              style={{
                marginTop: 8,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: countdown.valueColor,
                lineHeight: "34px",
              }}
            >
              {countdown.value}
            </T>
            <T style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: EMERALD_SOFT }}>{countdown.sub}</T>
          </div>
        </div>

        {/* QR cluster */}
        <div style={{ position: "absolute", right: 38, top: 96, width: 250, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/membership/nepal-map-glow.png"
            alt=""
            width={108}
            height={108}
            style={{
              width: 108,
              height: 108,
              marginTop: 34,
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 0 14px rgba(16,185,129,0.55))",
            }}
          />
          <div style={{ width: 150, textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: 138,
                height: 138,
                margin: "0 auto",
                borderRadius: 16,
                padding: 8,
                boxSizing: "border-box",
                background: "#ffffff",
                border: `2px solid ${GOLD}`,
                boxShadow: `0 0 0 1px rgba(246,226,122,0.35), 0 0 28px rgba(212,175,55,0.4), 0 0 22px rgba(16,185,129,0.22)`,
              }}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="" width={122} height={122} style={{ width: 122, height: 122, display: "block" }} />
              ) : (
                <div
                  style={{
                    width: 122,
                    height: 122,
                    display: "grid",
                    placeItems: "center",
                    background: "#f4f4f5",
                    color: "#71717a",
                    fontSize: 11,
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
                width={34}
                height={34}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 34,
                  height: 34,
                  marginLeft: -17,
                  marginTop: -17,
                  borderRadius: 10,
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                  background: "#022c22",
                  display: "block",
                }}
              />
            </div>
            <T
              style={{
                marginTop: 10,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: GOLD,
              }}
            >
              Scan to verify
            </T>
            <T style={{ marginTop: 4, fontSize: 10, fontWeight: 600, color: "rgba(244,244,245,0.82)", lineHeight: "14px" }}>
              Verify this membership at firenepal.com/verify
            </T>
          </div>
        </div>

        {/* Gold section divider */}
        <div
          style={{
            position: "absolute",
            left: 34,
            right: 34,
            top: 392,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, transparent)`,
            boxShadow: "0 0 12px rgba(212,175,55,0.35)",
          }}
        />

        {/* ─── Bottom left: member details ─── */}
        <div style={{ position: "absolute", left: 42, top: 418, width: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <BadgeCheck size={15} color={EMERALD_SOFT} />
            <T
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: EMERALD_SOFT,
              }}
            >
              Member Details
            </T>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {detailRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(52,211,153,0.35)",
                      background: "rgba(6,78,59,0.35)",
                      color: EMERALD_SOFT,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={13} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <T
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(161,161,170,0.95)",
                      }}
                    >
                      {row.label}
                    </T>
                    <T
                      style={{
                        marginTop: 2,
                        fontSize: 15,
                        fontWeight: 800,
                        color: row.gold ? GOLD : "#ffffff",
                        lineHeight: "20px",
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
        <div style={{ position: "absolute", left: 590, top: 430, width: 220 }}>
          <FireEmblem />
        </div>

        {/* Bottom right: empowerment */}
        <div style={{ position: "absolute", right: 42, top: 418, width: 390 }}>
          <T
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: EMERALD_SOFT,
              marginBottom: 12,
            }}
          >
            What We Empower You To Do
          </T>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EMPOWERMENT.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(16,185,129,0.18)",
                      border: "1px solid rgba(52,211,153,0.35)",
                      color: EMERALD_SOFT,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={13} />
                  </span>
                  <T className="font-nepali" style={{ fontSize: 15, fontWeight: 700, color: "rgba(236,253,245,0.95)", lineHeight: "22px" }}>
                    {item.text}
                  </T>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div>
              <T
                style={{
                  fontFamily: 'var(--font-signature), "Great Vibes", "Segoe Script", cursive',
                  fontSize: 34,
                  fontWeight: 400,
                  color: GOLD,
                  lineHeight: "38px",
                  textShadow: "0 0 18px rgba(212,175,55,0.35)",
                }}
              >
                FIRE Nepal
              </T>
              <T style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "rgba(244,244,245,0.78)", fontStyle: "italic" }}>
                Thank you for being a part of our mission.
              </T>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/membership/holo-seal.png"
              alt=""
              width={58}
              height={58}
              style={{
                width: 58,
                height: 58,
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 0 10px rgba(16,185,129,0.45))",
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 36px",
            borderTop: "1px solid rgba(212,175,55,0.28)",
            background: "rgba(0,0,0,0.72)",
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(209,250,229,0.88)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Globe2 size={13} />
            www.firenepal.com
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#ecfdf5" }}>
            <Lock size={13} />
            Secure. Private. Trusted.
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Headphones size={13} />
            firenepal853@gmail.com
          </span>
        </div>
      </div>
    );
  },
);
