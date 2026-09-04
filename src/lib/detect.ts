import type { DetectedScript } from "./types"

const KANJI = /[\u4e00-\u9fff々〆ヵヶ]/
const KANA = /[\u3040-\u30ff\uff66-\uff9d]/
const LATIN = /[A-Za-z\u00c0-\u024f]/

export function hasKanji(s: string): boolean {
  return KANJI.test(s)
}

export function hasKana(s: string): boolean {
  return KANA.test(s)
}

export function hasLatin(s: string): boolean {
  return LATIN.test(s)
}

export function tokenScript(s: string): "latin" | "kana" | "kanji" | "other" {
  if (hasKanji(s)) return "kanji"
  if (hasKana(s)) return "kana"
  if (hasLatin(s)) return "latin"
  return "other"
}

export function detectScript(s: string): DetectedScript {
  const trimmed = s.trim()
  if (!trimmed) return "empty"
  const kanji = hasKanji(trimmed)
  const kana = hasKana(trimmed)
  const latin = hasLatin(trimmed)
  const japanese = kanji || kana
  if (japanese && latin) return "mixed"
  if (japanese) return "japanese"
  if (latin) return "latin"
  return "mixed"
}
