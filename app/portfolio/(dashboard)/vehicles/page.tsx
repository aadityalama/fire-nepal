import type { Metadata } from "next";
import { PortfolioVehiclesPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Vehicles | Portfolio | FIRE Nepal",
  description: "Cars, bikes, and other titled vehicle assets.",
};

export default function Page() {
  return <PortfolioVehiclesPage />;
}
