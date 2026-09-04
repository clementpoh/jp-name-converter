/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

const PORT = 43147

/**
 * `zlibjs/bin/gunzip.min.js` (a transitive dep of kuromoji) is a legacy UMD
 * bundle. Its IIFE ends with `.call(this)` and captures that `this` as its
 * "global" object. In an ESM module context `this` is `undefined`, so at
 * runtime the very first exported symbol registration does
 *   ("Zlib" in undefined)  →  TypeError: Cannot use 'in' operator to search
 *                             for 'Zlib' in undefined
 * Rewrite that single call site to bind to `globalThis` instead.
 */
function patchZlibjsUmd(): Plugin {
  return {
    name: "patch-zlibjs-umd-this",
    enforce: "pre",
    transform(code, id) {
      // Only touch node_modules/zlibjs/bin/*.min.js.
      if (!/[\\/]zlibjs[\\/]bin[\\/][^\\/]+\.min\.js(\?|$)/.test(id)) return null
      // The upstream file ends with `.call(this);\n`. Bind `this` to
      // `globalThis` so the internal `var t=this` sees a real global.
      const patched = code.replace(
        /\)\.call\(this\);?\s*$/,
        ").call(globalThis);\n",
      )
      if (patched === code) return null
      return { code: patched, map: null }
    },
  }
}

export default defineConfig(({ mode }) => {
  const singlefile = mode === "singlefile"

  return {
    plugins: [
      patchZlibjsUmd(),
      react(),
      tailwindcss(),
      VitePWA({
        // In singlefile mode we produce an HTML that is meant to be opened
        // from disk (file://) or emailed around. Service workers cannot be
        // installed from file:// and there's no server, so PWA is disabled
        // but the virtual `virtual:pwa-register` module is still stubbed.
        disable: singlefile,
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
    // Relative base so the built HTML works when opened directly from disk.
    base: singlefile ? "./" : "/",
    define: {
      __SINGLEFILE__: JSON.stringify(singlefile),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: singlefile
      ? {
          outDir: "dist-single",
          emptyOutDir: true,
          // Inline every asset that Rollup emits so we can fold the HTML into
          // a single file with a post-build pass.
          assetsInlineLimit: 100 * 1024 * 1024,
          cssCodeSplit: false,
          modulePreload: { polyfill: false },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
              manualChunks: undefined,
            },
          },
        }
      : undefined,
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
  }
})
