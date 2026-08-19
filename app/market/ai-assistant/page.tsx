import type { Metadata } from "next";
import { NepseAssistantPage } from "@/components/market/NepseAssistantPage";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

export const metadata: Metadata = {
  title: "Market AI Assistant | FIRE Nepal NEPSE Hub",
  description: NEPSE_HUB_TEMPORARILY_DISABLED
    ? "We are working on it. Premium NEPSE Hub is temporarily unavailable."
    : "Ask about sectors, leaders and companies — answered live from the NEPSE snapshot.",
};

export default function AssistantRoute() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  return <NepseAssistantPage />;
}
