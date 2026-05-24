import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // heic2any ships untranspiled CJS + bundled libheif — Next must transpile it for App Router / Turbopack.
  transpilePackages: ["heic2any", "tesseract.js"],
};

export default nextConfig;
