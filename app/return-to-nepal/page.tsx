import type { Metadata } from "next";
import { ReturnToNepalPlannerDashboard } from "@/components/return-to-nepal/ReturnToNepalPlannerDashboard";
import { ReturnToNepalProvider } from "@/contexts/ReturnToNepalContext";

/** App route: `/return-to-nepal` — premium glass planner aligned with Pension workspace patterns. */
export const metadata: Metadata = {
  title: "Return to Nepal Planner | FIRE Nepal",
  description:
    "Premium life-transition OS for Nepalis abroad — Korea savings, Nepal cost of living, passive income, house build, family resettlement, and return readiness in one workspace.",
};

export default function ReturnToNepalPage() {
  return (
    <ReturnToNepalProvider>
      <ReturnToNepalPlannerDashboard />
    </ReturnToNepalProvider>
  );
}
