"use client";

import { OnboardingFlow } from "@/components/product/onboarding/OnboardingFlow";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";

export default function OnboardingPage() {
  return (
    <DashboardAccessGuard>
      <OnboardingFlow />
    </DashboardAccessGuard>
  );
}
