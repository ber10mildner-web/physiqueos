import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sigma",
    short_name: "Sigma",
    description: "Nutrition, training, body and progress in one place.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    // Long press on the app icon (Android; iOS ignores shortcuts for web apps).
    shortcuts: [
      { name: "Essen eintragen", short_name: "Essen", url: "/nutrition/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Barcode scannen", short_name: "Barcode", url: "/nutrition/add?tab=scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Gewicht eintragen", short_name: "Gewicht", url: "/body", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
