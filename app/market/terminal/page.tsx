import { NepseProfessionalTerminal } from "@/components/market/NepseProfessionalTerminal";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

export const metadata = {
  title: "NEPSE Market Terminal | FIRE Nepal",
  description: NEPSE_HUB_TEMPORARILY_DISABLED
    ? "We are working on it. Premium NEPSE Hub is temporarily unavailable."
    : "Professional NEPSE market terminal — indices, movers, heatmap, screener, watchlists, alerts and calendar.",
};

export default function MarketTerminalPage() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  return <NepseProfessionalTerminal />;
}
