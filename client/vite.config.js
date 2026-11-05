import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "Vastram Clothing Store",
        short_name: "Vastram",
        description: "Shop clothing online",
        theme_color: "#f07824",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,ico}"] }
    })
  ],
  server: { host: true }
});
