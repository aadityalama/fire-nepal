"use client";

import { Building2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { groupLogoInitials } from "@/lib/group-profile-logo";

const DEFAULT_TITLE = "Roommate Settlement Summary";

export type SettlementBrandingHeaderProps = {
  companyName?: string;
  roomNumber?: string;
  reportSubtitle?: string | null;
  logoUrl?: string;
  hasGroupBranding: boolean;
  /** compact = card preview, default = modal, export = largest hierarchy */
  variant?: "compact" | "default" | "export";
  className?: string;
};

function SettlementBrandingHeaderInner({
  companyName = "",
  roomNumber = "",
  reportSubtitle,
  logoUrl = "",
  hasGroupBranding,
  variant = "default",
  className = "",
}: SettlementBrandingHeaderProps) {
  const [logoErrorUrl, setLogoErrorUrl] = useState<string | null>(null);
  const showLogo = Boolean(logoUrl) && logoErrorUrl !== logoUrl;

  const onLogoError = useCallback(() => setLogoErrorUrl(logoUrl), [logoUrl]);

  const titleClass =
    variant === "export"
      ? "text-xl font-black tracking-tight text-[#111827] sm:text-2xl"
      : variant === "compact"
        ? "text-[15px] font-black leading-tight tracking-tight text-[#111827]"
        : "text-lg font-black leading-tight tracking-tight text-[#111827] sm:text-xl";

  const roomClass =
    variant === "export"
      ? "text-base font-bold text-[#10B981]"
      : variant === "compact"
        ? "text-xs font-semibold text-[#10B981]"
        : "text-sm font-semibold text-[#10B981]";

  const subtitleClass =
    variant === "export"
      ? "text-sm font-medium text-[#6B7280]"
      : variant === "compact"
        ? "text-[10px] font-medium text-[#6B7280]"
        : "text-xs font-medium text-[#6B7280]";

  const logoSize =
    variant === "export" ? "h-12 w-12 sm:h-14 sm:w-14" : variant === "compact" ? "h-10 w-10" : "h-11 w-11";

  if (!hasGroupBranding) {
    return (
      <h2
        className={`font-black text-[#111827] ${variant === "export" ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} ${className}`}
      >
        <span aria-hidden>🏠 </span>
        {DEFAULT_TITLE}
      </h2>
    );
  }

  const initials = groupLogoInitials(companyName);
  const logoAlt = companyName ? `${companyName} logo` : "Group logo";

  return (
    <div className={`flex min-w-0 items-start gap-3 ${className}`}>
      <div
        className={`grid ${logoSize} shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white text-[#10B981] shadow-sm`}
        role="img"
        aria-label={showLogo ? logoAlt : initials.length >= 2 ? `${initials} group mark` : "Default group icon"}
      >
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={onLogoError}
            decoding="async"
          />
        ) : initials.length >= 2 ? (
          <span className="text-xs font-black tracking-wide" aria-hidden>
            {initials}
          </span>
        ) : (
          <Building2 size={variant === "compact" ? 16 : 20} strokeWidth={2.25} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {companyName ? (
          <h2 className={`truncate ${titleClass}`}>{companyName}</h2>
        ) : null}
        {roomNumber ? (
          <p className={`truncate ${roomClass} ${companyName ? "mt-0.5" : ""}`}>
            Room {roomNumber}
          </p>
        ) : null}
        {(reportSubtitle ?? DEFAULT_TITLE) ? (
          <p
            className={`${subtitleClass} ${companyName || roomNumber ? "mt-1.5" : ""}`}
          >
            {reportSubtitle ?? DEFAULT_TITLE}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const SettlementBrandingHeader = memo(SettlementBrandingHeaderInner);

export function GroupProfileCardSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
      aria-hidden
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-5 w-3/5 rounded-lg bg-gray-100" />
          <div className="h-4 w-2/5 rounded-lg bg-gray-50" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
        </div>
        <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
