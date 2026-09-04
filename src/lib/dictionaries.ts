import { JP_COMMON, KANJI_OVERLAYS } from "@/data/kanji-overlays"
import { LATIN_NAMES } from "@/data/latin-names"
import { kanaToRomaji, titleCaseName } from "./romaji"
import type { Origin, ReadingOption, TokenSource } from "./types"

export type EnamdictFile = {
  attribution: string
  kanji: Record<string, Array<{ k: string; t: string }>>
  latin: Record<string, Array<{ k: string; t: string }>>
}

let enamdict: EnamdictFile | null = null
let enamdictPromise: Promise<EnamdictFile | null> | null = null

export function getEnamdict(): EnamdictFile | null {
  return enamdict
}

export function enamdictStatus(): "idle" | "loading" | "ready" | "error" {
  if (enamdict) return "ready"
  if (enamdictPromise) return "loading"
  return "idle"
}

export async function loadEnamdict(): Promise<EnamdictFile | null> {
  if (enamdict) return enamdict
  if (!enamdictPromise) {
    enamdictPromise = fetchEnamdict()
  }
  return enamdictPromise
}

async function fetchEnamdict(): Promise<EnamdictFile | null> {
  try {
    const res = await fetch("/data/enamdict-people.json.gz")
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    const stream = res.body.pipeThrough(new DecompressionStream("gzip"))
    const data = (await new Response(stream).json()) as EnamdictFile
    enamdict = data
    return data
  } catch (error) {
    console.warn("ENAMDICT extract failed to load", error)
    enamdictPromise = null
    return null
  }
}

export function normalizeLatinKey(token: string): string {
  return token
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’.\-]/g, "")
}

function option(
  kana: string,
  source: TokenSource,
  origin: Origin | undefined,
  romajiHint?: string,
): ReadingOption {
  const romaji = romajiHint || titleCaseName(kanaToRomaji(kana)) || kana
  const originLabel = origin ? ` · ${origin}` : ""
  return {
    kana,
    origin,
    source,
    romaji,
    label: `${kana} (${romaji}${originLabel})`,
  }
}

function mergeOptions(list: ReadingOption[]): ReadingOption[] {
  const seen = new Set<string>()
  const out: ReadingOption[] = []
  for (const item of list) {
    const key = `${item.kana}::${item.origin ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function lookupLatin(token: string): ReadingOption[] {
  const key = normalizeLatinKey(token)
  const hits = LATIN_NAMES[key] ?? []
  const fromLatin = hits.map((h) => option(h.kana, "dictionary", h.origin))
  const fromEnam = (enamdict?.latin[key] ?? []).map((h) =>
    option(h.k, "dictionary", "japanese"),
  )
  return mergeOptions([...fromLatin, ...fromEnam])
}

export function lookupKanji(token: string): ReadingOption[] {
  const overlay = (KANJI_OVERLAYS[token] ?? []).map((h) =>
    option(h.kana, "overlay", h.origin, h.romaji),
  )
  const common = (JP_COMMON[token] ?? []).map((h) =>
    option(h.kana, "dictionary", "japanese", h.romaji),
  )
  const fromEnam = (enamdict?.kanji[token] ?? []).map((h) =>
    option(h.k, "dictionary", "japanese"),
  )
  return mergeOptions([...overlay, ...common, ...fromEnam])
}

export function isKnownSurname(token: string): boolean {
  if (KANJI_OVERLAYS[token] || JP_COMMON[token]) return true
  const entries = enamdict?.kanji[token]
  return Boolean(entries?.some((e) => e.t === "surname" || e.t === "person"))
}

export function isKnownGiven(token: string): boolean {
  if (JP_COMMON[token]) return true
  const entries = enamdict?.kanji[token]
  return Boolean(entries?.some((e) => e.t === "given" || e.t === "person"))
}

/** Longest-prefix surname then given, for unspaced 山田太郎. */
export function splitKanjiName(text: string): string[] {
  if (!text) return []
  if (lookupKanji(text).length) return [text]
  const max = Math.min(4, text.length - 1)
  for (let len = max; len >= 1; len--) {
    const head = text.slice(0, len)
    const rest = text.slice(len)
    if (!rest) continue
    if (lookupKanji(head).length && lookupKanji(rest).length) {
      return [head, rest]
    }
    if (isKnownSurname(head) && (lookupKanji(rest).length || isKnownGiven(rest))) {
      return [head, rest]
    }
  }
  for (let len = 1; len <= Math.min(3, text.length - 1); len++) {
    const tail = text.slice(-len)
    const head = text.slice(0, -len)
    if (lookupKanji(head).length && lookupKanji(tail).length) {
      return [head, tail]
    }
  }
  return [text]
}
