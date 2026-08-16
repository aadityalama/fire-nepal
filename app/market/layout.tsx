import { NepseMarketShell } from "@/components/market/NepseMarketShell";
import { WealthPortfolioProvider } from "@/contexts/WealthPortfolioContext";
import { RealtimeMarketProvider } from "@/providers/realtime-provider";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <WealthPortfolioProvider>
      <RealtimeMarketProvider board="full">
        <NepseMarketShell>{children}</NepseMarketShell>
      </RealtimeMarketProvider>
    </WealthPortfolioProvider>
  );
}
