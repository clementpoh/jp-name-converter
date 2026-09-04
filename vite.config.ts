/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

const PORT = 43147

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "data/enamdict-people.json.gz"],
      manifest: {
        name: "JP Payee Kana",
        short_name: "Payee Kana",
        description:
          "Convert beneficiary names to Zengin half-width katakana, offline.",
        theme_color: "#1e293b",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2,json,gz,webmanifest}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === "cdn.jsdelivr.net" &&
              url.pathname.includes("/kuromoji"),
            handler: "CacheFirst",
            options: {
              cacheName: "kuromoji-dict",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: PORT,
    host: true,
    strictPort: true,
  },
  preview: {
    port: PORT,
    host: true,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
