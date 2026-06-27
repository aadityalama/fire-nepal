import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import Script from "next/script";
import { FireNepalStructuredData } from "@/components/brand/FireNepalStructuredData";
import { ProductProviders } from "@/components/product/ProductProviders";
import { buildRootMetadata } from "@/lib/brand/site-seo";
import "./globals.css";

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-homepage-language="en" suppressHydrationWarning>
      <body className={notoSansDevanagari.variable}>
        <FireNepalStructuredData />
        <Script id="fire-nepal-theme-init" strategy="beforeInteractive">
          {`(function(){try{var k="fire-nepal-theme-v1";var raw=localStorage.getItem(k);var mode=raw==="light"||raw==="dark"||raw==="system"?raw:"dark";var dark=mode==="dark"||(mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=dark?"dark":"light";document.documentElement.setAttribute("data-fire-theme",r);document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.setAttribute("data-fire-theme","dark");document.documentElement.style.colorScheme="dark";}})();`}
        </Script>
        <ProductProviders>{children}</ProductProviders>
      </body>
    </html>
  );
}
