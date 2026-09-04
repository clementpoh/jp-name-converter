import { describe, it, expect } from "vitest"
import { gzipSync } from "node:zlib"

/**
 * Regression test for the `patchZlibjsUmd` plugin in vite.config.ts.
 *
 * `zlibjs/bin/gunzip.min.js` is Closure output with no `module.exports`; it
 * publishes its API onto whatever `this` its trailing `.call(this)` provides.
 * Under plain ESM that `this` is `undefined`, which broke kuromoji two
 * different ways in production:
 *
 *   1. unpatched          -> "Cannot use 'in' operator to search for 'Zlib'
 *                            in undefined"
 *   2. bound to globalThis -> "Cannot read properties of undefined
 *                            (reading 'Gunzip')" because the module's exports
 *                            stayed empty.
 *
 * Vitest runs the same Vite plugin pipeline as the build, so importing the
 * package here actually exercises the transform.
 */

type ZlibNamespace = {
  Zlib?: { Gunzip?: new (input: Uint8Array) => { decompress(): Uint8Array } }
}

describe("zlibjs UMD interop", () => {
  it("exposes Zlib.Gunzip the way kuromoji reads it", async () => {
    // kuromoji does: var zlib = require("zlibjs/bin/gunzip.min.js")
    //                new zlib.Zlib.Gunzip(...)
    const mod = (await import("zlibjs/bin/gunzip.min.js")) as unknown as {
      default?: ZlibNamespace
    } & ZlibNamespace

    // Whichever shape the CJS interop hands back, `.Zlib.Gunzip` must resolve.
    const viaDefault = mod.default?.Zlib?.Gunzip
    const viaNamed = mod.Zlib?.Gunzip

    expect(viaDefault ?? viaNamed).toBeTypeOf("function")
  })

  it("actually decompresses a gzip payload", async () => {
    const mod = (await import("zlibjs/bin/gunzip.min.js")) as unknown as {
      default?: ZlibNamespace
    } & ZlibNamespace

    const Gunzip = mod.default?.Zlib?.Gunzip ?? mod.Zlib?.Gunzip
    expect(Gunzip).toBeTypeOf("function")

    const original = "山田太郎"
    const payload = gzipSync(Buffer.from(original, "utf8"))

    const gz = new Gunzip!(new Uint8Array(payload))
    const out = Buffer.from(gz.decompress()).toString("utf8")

    expect(out).toBe(original)
  })
})
