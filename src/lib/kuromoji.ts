const KUROMJI_VERSION = "0.1.2"
export const KUROMJI_DICT_CDN = `https://cdn.jsdelivr.net/npm/kuromoji@${KUROMJI_VERSION}/dict/`

const DICT_FILES = [
  "base.dat.gz",
  "cc.dat.gz",
  "check.dat.gz",
  "tid.dat.gz",
  "tid_map.dat.gz",
  "tid_pos.dat.gz",
  "unk.dat.gz",
  "unk_char.dat.gz",
  "unk_compat.dat.gz",
  "unk_invoke.dat.gz",
  "unk_map.dat.gz",
  "unk_pos.dat.gz",
]

type KuroshiroLike = {
  init: (analyzer: unknown) => Promise<void>
  convert: (
    text: string,
    opts: { to: "katakana" | "romaji"; romajiSystem?: string },
  ) => Promise<string>
}

let kuroshiro: KuroshiroLike | null = null
let loadPromise: Promise<KuroshiroLike> | null = null

export function isKuromojiReady(): boolean {
  return kuroshiro != null
}

export async function prefetchKuromojiDict(
  onProgress?: (ratio: number) => void,
): Promise<void> {
  let loaded = 0
  const total = DICT_FILES.length
  await Promise.all(
    DICT_FILES.map(async (file) => {
      const url = `${KUROMJI_DICT_CDN}${file}`
      const res = await fetch(url, { mode: "cors" })
      if (!res.ok) throw new Error(`Failed to download ${file}`)
      await res.arrayBuffer()
      loaded += 1
      onProgress?.(loaded / total)
    }),
  )
}

export async function loadKuromoji(
  onProgress?: (ratio: number) => void,
): Promise<KuroshiroLike> {
  if (kuroshiro) return kuroshiro
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    onProgress?.(0.02)
    await prefetchKuromojiDict((ratio) => onProgress?.(0.05 + ratio * 0.75))
    const [{ default: KuroshiroMod }, { default: AnalyzerMod }] =
      await Promise.all([
        import("kuroshiro"),
        import("kuroshiro-analyzer-kuromoji"),
      ])
    const Kuroshiro = unwrap(KuroshiroMod)
    const KuromojiAnalyzer = unwrap(AnalyzerMod)
    const instance = new Kuroshiro() as KuroshiroLike
    await instance.init(new KuromojiAnalyzer({ dictPath: KUROMJI_DICT_CDN }))
    kuroshiro = instance
    onProgress?.(1)
    return instance
  })()
  try {
    return await loadPromise
  } catch (error) {
    loadPromise = null
    throw error
  }
}

export async function readingWithKuromoji(text: string): Promise<string> {
  const engine = await loadKuromoji()
  return engine.convert(text, { to: "katakana" })
}

function unwrap<T>(mod: T | { default: T }): T {
  if (mod && typeof mod === "object" && "default" in mod) {
    const inner = (mod as { default: T }).default
    if (inner && typeof inner === "object" && "default" in (inner as object)) {
      return (inner as unknown as { default: T }).default
    }
    return inner
  }
  return mod as T
}
