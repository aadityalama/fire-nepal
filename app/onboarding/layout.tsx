import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Onboarding | FIRE Nepal",
  description: "Seed your FIRE profile and optional cashflow defaults — local-first.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
