import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project slugs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress logs during build (except in CI)
  silent: !process.env.CI,

  // Source maps configuration
  sourcemaps: {
    // Delete source maps after upload (don't expose in production)
    deleteSourcemapsAfterUpload: true,
  },
});
