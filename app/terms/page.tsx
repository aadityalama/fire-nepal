import type { Metadata } from "next";
import { TermsFooterInfoPage } from "@/components/footer-info/FooterInfoPage";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Terms of Service | FIRE Nepal",
  description:
    "Read FIRE Nepal terms covering user responsibilities, financial and investment disclaimers, calculator estimates, account rules, liability, changes, and termination.",
  alternates: buildCanonicalAlternates("/terms"),
};

export default function TermsPage() {
  return <TermsFooterInfoPage />;
}
