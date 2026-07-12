import type { Metadata } from "next";
import { ContactPageContent } from "@/components/footer-info/FooterInfoPage";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Contact Us | FIRE Nepal",
  description:
    "Contact FIRE Nepal for product questions, support, partnerships, and feedback about financial independence tools for Nepalis abroad.",
  alternates: buildCanonicalAlternates("/contact"),
};

export default function ContactPage() {
  return <ContactPageContent />;
}
