import type { Metadata } from "next";
import { AboutFooterInfoPage } from "@/components/footer-info/FooterInfoPage";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "About FIRE Nepal",
  description:
    "Learn how FIRE Nepal helps Nepalis achieve financial freedom and financial independence — with planning tools, investing education, retirement readiness, and Nepal return confidence.",
  alternates: buildCanonicalAlternates("/about"),
};

export default function AboutPage() {
  return <AboutFooterInfoPage />;
}
