import type { NextConfig } from "next";

const pages = process.env.NEXT_PUBLIC_SITE_MODE === 'pages';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig: NextConfig = {
  basePath,
  cacheComponents: !pages,
  partialPrefetching: !pages,
  ...(pages ? {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    // Only the static build excludes .ts API handlers. App pages/layouts use .tsx.
    pageExtensions: ['tsx'],
  } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
