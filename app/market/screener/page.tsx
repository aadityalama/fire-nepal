import type { Metadata } from "next";
import { NepseScreenerPage } from "@/components/market/NepseScreenerPage";

export const metadata: Metadata = {
  title: "Stock Screener | FIRE Nepal NEPSE Hub",
  description: "Filter every NEPSE company by sector, price, change, volume and turnover with live data.",
};

export default function ScreenerRoute() {
  return <NepseScreenerPage />;
}
