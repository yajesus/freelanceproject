import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    deviceSizes: [320, 420, 640, 750, 828], // Mobile-focused device sizes
    imageSizes: [16, 32, 64, 96, 128], // Smaller image sizes for mobile
    formats: ["image/webp", "image/avif"], // Modern formats for better compression
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|mov)$/,
      type: "asset/resource",
    });
    return config;
  },
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
};

export default withNextIntl(nextConfig);
