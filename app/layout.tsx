import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { ProductProviders } from "@/components/product/ProductProviders";
import "./globals.css";

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FIRE Nepal | Financial Independence for Korean Workers",
  description:
    "A premium fintech dashboard for KRW to NPR planning, FIRE progress tracking, and Nepal return readiness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={notoSansDevanagari.variable}>
        <ProductProviders>{children}</ProductProviders>
      </body>
    </html>
  );
}
