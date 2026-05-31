import type { Metadata } from "next";
import { ContactPageContent } from "@/components/footer-info/FooterInfoPage";

export const metadata: Metadata = {
  title: "Contact Us | FIRE Nepal",
  description:
    "Contact FIRE Nepal for product questions, support, partnerships, and feedback about financial independence tools for Nepalis abroad.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}
