import { WealthPortfolioProvider } from "@/contexts/WealthPortfolioContext";
import { RealtimeMarketProvider } from "@/providers/realtime-provider";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <WealthPortfolioProvider>
      <RealtimeMarketProvider>{children}</RealtimeMarketProvider>
    </WealthPortfolioProvider>
  );
}
