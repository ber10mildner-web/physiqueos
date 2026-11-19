import type { NextConfig } from "next";

// Cache Components are intentionally disabled: nearly every page in PhysiqueOS
// is per-user and read at request time, so the classic dynamic rendering model
// is simpler and less error-prone here. See docs/ARCHITECTURE.md.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
