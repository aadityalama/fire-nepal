import { FireBizLayoutClient } from "@/components/fire-biz/FireBizLayoutClient";

export default function FireBizLayout({ children }: { children: React.ReactNode }) {
  return <FireBizLayoutClient>{children}</FireBizLayoutClient>;
}
