import { FireLendingLayoutClient } from "@/components/fire-lending/FireLendingLayoutClient";

export default function FireLendingLayout({ children }: { children: React.ReactNode }) {
  return <FireLendingLayoutClient>{children}</FireLendingLayoutClient>;
}
