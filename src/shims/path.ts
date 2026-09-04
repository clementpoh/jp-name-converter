// Browser shim for the tiny subset of Node's `path` module that kuromoji
// actually uses (just `join`, for building dictionary URLs).
//
// The default node externalization Rolldown/Vite applies for browser bundles
// leaves `path` as an empty stub, so `path.join(...)` blows up at runtime
// with `n.join is not a function`. We alias the bare `"path"` specifier to
// this file in vite.config.ts so kuromoji's DictionaryLoader gets a real
// join implementation.
//
// The join is deliberately URL-aware: when the first segment is an absolute
// URL like https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/, we must NOT
// collapse the `//` in `https://` (which POSIX-style path.join would do).

export function join(...segments: unknown[]): string {
  const parts = segments
    .filter((s): s is string => typeof s === "string" && s.length > 0)
  if (parts.length === 0) return "."
  return parts
    .map((s, i, arr) => {
      let t = s
      // Only trim leading '/' from segments after the first (preserve
      // absolute-path or URL prefixes on the first segment).
      if (i > 0) t = t.replace(/^\/+/, "")
      // Only trim trailing '/' before joining (leave the last segment alone
      // so callers who explicitly want a trailing slash keep it).
      if (i < arr.length - 1) t = t.replace(/\/+$/, "")
      return t
    })
    .join("/")
}

// The other functions are not used by kuromoji, but a couple of throwaway
// stubs make the shim safer if kuroshiro or another indirect dep touches
// them. They intentionally return sensible-but-minimal values.
export function dirname(p: string): string {
  const idx = String(p ?? "").lastIndexOf("/")
  return idx <= 0 ? "." : p.slice(0, idx)
}
export function basename(p: string, ext?: string): string {
  const name = String(p ?? "").split("/").pop() ?? ""
  return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name
}
export function resolve(...segments: string[]): string {
  return join(...segments)
}
export const sep = "/"
export const posix = { join, dirname, basename, resolve, sep }

export default { join, dirname, basename, resolve, sep, posix }
