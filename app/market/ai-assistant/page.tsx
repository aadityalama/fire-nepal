import type { Metadata } from "next";
import { NepseAssistantPage } from "@/components/market/NepseAssistantPage";

export const metadata: Metadata = {
  title: "Market AI Assistant | FIRE Nepal NEPSE Hub",
  description: "Ask about sectors, leaders and companies — answered live from the NEPSE snapshot.",
};

export default function AssistantRoute() {
  return <NepseAssistantPage />;
}
