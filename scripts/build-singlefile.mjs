#!/usr/bin/env node
// Build a single self-contained HTML file that runs the app from file://.
//
// Pipeline:
//   1. Run `vite build --mode singlefile` (writes dist-single/index.html plus
//      dist-single/assets/*.js and *.css). See vite.config.ts for the mode.
//   2. Fold every <script src> and every <link rel="stylesheet"> that Vite
//      emitted into the HTML as inline <script> / <style> tags.
//   3. Base64-encode public/data/enamdict-people.json.gz and inject it as
//      window.__ENAMDICT_GZ_B64__ so src/lib/dictionaries.ts can decode it
//      in memory instead of fetching.
//   4. Write dist-single/jp-name-converter.html and clean up the assets folder.
//
// Result is a single ~6 MB HTML file that works entirely offline.

import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs"
import { resolve, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const outDir = join(root, "dist-single")
const dictPath = join(root, "public/data/enamdict-people.json.gz")

function log(msg) {
  process.stdout.write(`[singlefile] ${msg}\n`)
}

function runVite() {
  log("running: vite build --mode singlefile")
  const result = spawnSync(
    "npx",
    ["vite", "build", "--mode", "singlefile"],
    { cwd: root, stdio: "inherit", env: process.env },
  )
  if (result.status !== 0) {
    throw new Error(`vite build failed (exit ${result.status})`)
  }
}

function escapeForScript(str) {
  // </script inside a string literal would end the surrounding <script> tag.
  return str.replace(/<\/script/gi, "<\\/script")
}

function inlineAssets(html) {
  // Inline <script type="module" src="./assets/xxx.js"></script>
  html = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, src) => {
      const file = join(outDir, src.replace(/^\.?\//, ""))
      if (!existsSync(file)) {
        log(`  ! could not resolve script src=${src}, leaving as-is`)
        return match
      }
      const contents = readFileSync(file, "utf8")
      log(`  inlined script ${src} (${contents.length} chars)`)
      return `<script type="module">${escapeForScript(contents)}</script>`
    },
  )

  // Inline <link rel="stylesheet" href="./assets/xxx.css">
  html = html.replace(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi,
    (match) => {
      const hrefMatch = match.match(/\bhref=["']([^"']+)["']/i)
      if (!hrefMatch) return match
      const href = hrefMatch[1]
      const file = join(outDir, href.replace(/^\.?\//, ""))
      if (!existsSync(file)) {
        log(`  ! could not resolve stylesheet href=${href}, leaving as-is`)
        return match
      }
      const contents = readFileSync(file, "utf8")
      log(`  inlined stylesheet ${href} (${contents.length} chars)`)
      return `<style>${contents}</style>`
    },
  )

  // Vite may emit <link rel="modulepreload">; those refer to the same JS
  // we just inlined, so drop them.
  html = html.replace(
    /<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi,
    "",
  )

  return html
}

function injectDictionary(html) {
  if (!existsSync(dictPath)) {
    throw new Error(`dictionary not found at ${dictPath}`)
  }
  const bytes = readFileSync(dictPath)
  const b64 = bytes.toString("base64")
  log(
    `  encoded ${bytes.length.toLocaleString()} bytes gzip → ` +
      `${b64.length.toLocaleString()} chars base64`,
  )
  const tag = `<script>window.__ENAMDICT_GZ_B64__=${JSON.stringify(b64)};</script>`
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}\n</head>`)
  }
  return tag + html
}

function main() {
  runVite()

  const indexPath = join(outDir, "index.html")
  if (!existsSync(indexPath)) {
    throw new Error(`expected ${indexPath} after vite build`)
  }
  let html = readFileSync(indexPath, "utf8")

  html = inlineAssets(html)
  html = injectDictionary(html)

  const finalPath = join(outDir, "jp-name-converter.html")
  writeFileSync(finalPath, html, "utf8")
  log(`wrote ${finalPath} (${html.length.toLocaleString()} chars)`)

  // The intermediate index.html and assets/ folder are no longer needed.
  for (const rel of ["assets", "index.html", "data"]) {
    const p = join(outDir, rel)
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true })
      log(`removed ${rel}`)
    }
  }
}

main()
