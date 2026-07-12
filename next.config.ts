import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // heic2any ships untranspiled CJS + bundled libheif — Next must transpile it for App Router / Turbopack.
  transpilePackages: ["heic2any", "tesseract.js"],
  async headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Content-Type",
            value: "application/xml",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
