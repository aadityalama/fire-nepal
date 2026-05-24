import { WealthPortfolioProvider } from "@/contexts/WealthPortfolioContext";
import { RealtimeMarketProvider } from "@/providers/realtime-provider";

export default function PortfolioRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <WealthPortfolioProvider>
      <RealtimeMarketProvider>{children}</RealtimeMarketProvider>
    </WealthPortfolioProvider>
  );
}
