export const ORIGINS = [
  "western",
  "korean",
  "chinese",
  "vietnamese",
  "filipino",
  "indian",
  "japanese",
] as const

export type Origin = (typeof ORIGINS)[number]

export const SOURCES = [
  "dictionary",
  "romaji",
  "phonetic",
  "morphological",
  "kana",
  "suffix",
  "overlay",
] as const

export type TokenSource = (typeof SOURCES)[number]

export type Direction = "auto" | "en-to-ja" | "ja-to-en"

export type DetectedScript = "empty" | "latin" | "japanese" | "mixed"

export type IssueCode =
  | "overflow"
  | "illegal_char"
  | "kanji_unresolved"
  | "kanji_reading_uncertain"
  | "empty_after_normalize"

export type Issue = {
  code: IssueCode
  detail: string
}

export type ReadingOption = {
  kana: string
  origin?: Origin
  source: TokenSource
  romaji: string
  label: string
}

export type TokenResult = {
  raw: string
  script: "latin" | "kana" | "kanji" | "other"
  chosen: ReadingOption | null
  alternatives: ReadingOption[]
  unresolvedKanji: boolean
}

export type ZenginResult = {
  value: string
  fullValue: string
  bytes: number
  maxBytes: number
  truncated: boolean
  stripped: string[]
}

export type ConvertResult = {
  input: string
  detected: DetectedScript
  tokens: TokenResult[]
  katakana: string
  zengin: ZenginResult
  english: {
    display: string
    uppercase: string
    romaji: string
  }
  issues: Issue[]
}

export type ConvertOptions = {
  direction?: Direction
  maxBytes?: number
  selections?: Array<number | undefined>
  morphologicalReadings?: Record<string, string>
}
