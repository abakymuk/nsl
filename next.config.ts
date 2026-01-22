import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
};

export default nextConfig;
