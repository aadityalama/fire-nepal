"use client";

import { forwardRef } from "react";
import {
  PremiumFireNepalMemberCard,
  MEMBER_CARD_EXPORT_HEIGHT,
  MEMBER_CARD_EXPORT_WIDTH,
} from "@/components/membership/PremiumFireNepalMemberCard";
import type { MemberCardData } from "@/lib/member-card-profile";

export { MEMBER_CARD_EXPORT_HEIGHT, MEMBER_CARD_EXPORT_WIDTH };

type MemberCardExportProps = {
  data: MemberCardData;
};

/**
 * Dedicated PNG/PDF export surface.
 * Thin wrapper only — renders the same PremiumFireNepalMemberCard JSX/CSS as preview.
 * No duplicated artwork or simplified export layout.
 */
export const MemberCardExport = forwardRef<HTMLDivElement, MemberCardExportProps>(
  function MemberCardExport({ data }, ref) {
    return <PremiumFireNepalMemberCard ref={ref} data={data} mode="export" />;
  },
);
