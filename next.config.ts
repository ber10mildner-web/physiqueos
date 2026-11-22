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
  // The service worker must never be cached by the browser, or updates would not arrive.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
