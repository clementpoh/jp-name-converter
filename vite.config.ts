/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

const PORT = 43147

/**
 * `zlibjs/bin/gunzip.min.js` (a transitive dep of kuromoji) is Closure-compiler
 * output with no `module.exports` at all. It publishes its API by writing onto
 * whatever `this` its trailing `.call(this)` supplies:
 *
 *     (function(){ var aa = this; ... aa.Zlib.Gunzip = ...; }).call(this);
 *
 * It was built for browserify, where a module body runs with
 * `this === module.exports`, so `require(...)` yields `{ Zlib: {...} }` --
 * exactly what kuromoji's BrowserDictionaryLoader expects when it does
 * `zlib.Zlib.Gunzip`.
 *
 * Under Vite/Rolldown the file is evaluated as ESM, where top-level `this` is
 * `undefined`. That produces two distinct failures depending on the binding:
 *   - `this` left as-is  -> "Cannot use 'in' operator to search for 'Zlib' in
 *     undefined" while registering symbols.
 *   - `this` bound to `globalThis` -> no crash, but `Zlib` lands on `window`
 *     and the module exports stay empty, so kuromoji then hits
 *     "Cannot read properties of undefined (reading 'Gunzip')".
 *
 * So rather than guessing at a global, give the IIFE a dedicated scope object
 * and re-publish it through real ESM exports. Both `default` and the named
 * `Zlib` are exported so the result works whichever shape Vite's CJS interop
 * hands back to kuromoji's `require()`.
 */
function patchZlibjsUmd(): Plugin {
  return {
    name: "patch-zlibjs-umd-this",
    enforce: "pre",
    transform(code, id) {
      // Only touch node_modules/zlibjs/bin/*.min.js.
      if (!/[\\/]zlibjs[\\/]bin[\\/][^\\/]+\.min\.js(\?|$)/.test(id)) return null
      // The upstream file ends with `.call(this);\n` (note the newline).
      const body = code.replace(
        /\)\.call\(this\);?\s*$/,
        ").call(__zlibScope);\n",
      )
      if (body === code) return null
      return {
        code: [
          "const __zlibScope = {};",
          body,
          "export const Zlib = __zlibScope.Zlib;",
          "export default __zlibScope;",
        ].join("\n"),
        map: null,
      }
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
          name: "JP Name Converter",
          short_name: "Name Converter",
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
      alias: [
        {
          find: "@",
          replacement: path.resolve(import.meta.dirname, "./src"),
        },
        // Node's `path` gets externalized to an empty stub in browser bundles,
        // so kuromoji's `path.join(dic_path, filename)` blows up with
        // `n.join is not a function`. Redirect the bare specifier to a small
        // browser shim. `node:path` (used by this config file) is unaffected
        // because the prefix doesn't match.
        {
          find: /^path$/,
          replacement: path.resolve(
            import.meta.dirname,
            "./src/shims/path.ts",
          ),
        },
      ],
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
      server: {
        deps: {
          // Vitest externalizes node_modules by default, which would let Node
          // require zlibjs with CJS semantics (`this === module.exports`) and
          // mask the ESM interop bug the patchZlibjsUmd plugin exists to fix.
          // Inline it so zlibjs.test.ts exercises the real transform.
          inline: ["zlibjs"],
        },
      },
    },
  }
})
