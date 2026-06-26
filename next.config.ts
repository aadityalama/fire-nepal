import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // heic2any ships untranspiled CJS + bundled libheif — Next must transpile it for App Router / Turbopack.
  transpilePackages: ["heic2any", "tesseract.js"],
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
