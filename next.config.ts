import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Server Actions upload limit for training material attachments (phase 2)
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default withNextIntl(nextConfig);
