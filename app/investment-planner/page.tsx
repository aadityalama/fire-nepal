import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: { absolute: "Investment Planner | FIRE Nepal" },
  description:
    "Plan monthly SIP investing in NPR with FIRE Nepal’s SIP Calculator Nepal — maturity value, step-up, and wealth projections.",
  alternates: buildCanonicalAlternates("/sip-calculator"),
  robots: { index: false, follow: true },
};

/** Legacy duplicate of /sip-calculator — permanent redirect preserves a single canonical URL. */
export default function InvestmentPlannerPage() {
  permanentRedirect("/sip-calculator");
}
