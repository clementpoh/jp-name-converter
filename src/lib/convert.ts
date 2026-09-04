import { toKatakana, toHiragana, isKatakana } from "wanakana"
import { expandCompanySuffixes } from "./company-suffixes"
import { detectScript, tokenScript } from "./detect"
import {
  lookupKanji,
  lookupLatin,
  splitKanjiName,
} from "./dictionaries"
import { englishToKatakana, isCleanRomaji } from "./phonetic"
import { kanaToRomaji, passportUpper, titleCaseName } from "./romaji"
import { foldZengin, zenginIssues, ZENGIN_MAX_BYTES } from "./zengin"
import type {
  ConvertOptions,
  ConvertResult,
  Direction,
  Issue,
  ReadingOption,
  TokenResult,
} from "./types"

const TOKEN_SPLIT = /([^\s/.,;:()]+)|([/.,;:()]+)/g

function originPriority(origin: ReadingOption["origin"]): number {
  if (origin === "japanese") return 1
  if (origin === "korean") return 2
  if (origin === "chinese") return 3
  if (origin === "vietnamese") return 4
  if (origin === "western") return 5
  return 9
}

function pickDefault(
  options: ReadingOption[],
  direction: Direction,
): ReadingOption | null {
  if (!options.length) return null
  return [...options].sort((a, b) => {
    const score = (o: ReadingOption) => {
      if (direction === "ja-to-en") {
        return o.origin === "japanese" ? 0 : originPriority(o.origin) + 1
      }
      if (direction === "en-to-ja" && o.origin === "japanese") return 8
      return originPriority(o.origin)
    }
    return score(a) - score(b)
  })[0]
}

function tokenize(text: string): string[] {
  const pieces: string[] = []
  const matches = text.match(TOKEN_SPLIT)
  if (!matches) return text.trim() ? [text.trim()] : []
  for (const part of matches) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (/^[/.,;:()]+$/.test(trimmed)) continue
    const script = tokenScript(trimmed)
    if (script === "kanji") {
      pieces.push(...splitKanjiName(trimmed))
    } else {
      pieces.push(trimmed)
    }
  }
  return pieces
}

function kanaOption(raw: string): ReadingOption {
  const kana = isKatakana(raw.replace(/[()ｶﾕ]/g, ""))
    ? raw.replace(/ｶ/g, "カ").replace(/ﾕ/g, "ユ")
    : toKatakana(toHiragana(raw), { convertLongVowelMark: false })
  return {
    kana,
    source: "kana",
    romaji: titleCaseName(kanaToRomaji(kana)),
    label: kana,
  }
}

function resolveToken(
  raw: string,
  morphologicalReadings: Record<string, string> | undefined,
  direction: Direction,
): TokenResult {
  const script = tokenScript(raw)
  if (script === "kana") {
    const chosen = kanaOption(raw)
    return { raw, script, chosen, alternatives: [chosen], unresolvedKanji: false }
  }

  if (script === "latin") {
    const dict = lookupLatin(raw)
    if (dict.length) {
      return {
        raw,
        script,
        chosen: pickDefault(dict, direction),
        alternatives: dict,
        unresolvedKanji: false,
      }
    }
    if (isCleanRomaji(raw)) {
      const kana = toKatakana(raw.toLowerCase(), { convertLongVowelMark: false })
      const chosen: ReadingOption = {
        kana,
        source: "romaji",
        origin: "japanese",
        romaji: titleCaseName(kanaToRomaji(kana)),
        label: kana,
      }
      return { raw, script, chosen, alternatives: [chosen], unresolvedKanji: false }
    }
    const kana = englishToKatakana(raw)
    const chosen: ReadingOption | null = kana
      ? {
          kana,
          source: "phonetic",
          origin: "western",
          romaji: titleCaseName(kanaToRomaji(kana)),
          label: kana,
        }
      : null
    return {
      raw,
      script,
      chosen,
      alternatives: chosen ? [chosen] : [],
      unresolvedKanji: false,
    }
  }

  if (script === "kanji") {
    const dict = lookupKanji(raw)
    if (dict.length) {
      return {
        raw,
        script,
        chosen: pickDefault(dict, direction),
        alternatives: dict,
        unresolvedKanji: false,
      }
    }
    const morph = morphologicalReadings?.[raw]
    if (morph) {
      const kana = toKatakana(morph, { convertLongVowelMark: false })
      const chosen: ReadingOption = {
        kana,
        source: "morphological",
        romaji: titleCaseName(kanaToRomaji(kana)),
        label: kana,
      }
      return {
        raw,
        script,
        chosen,
        alternatives: [chosen],
        unresolvedKanji: false,
      }
    }
    return {
      raw,
      script,
      chosen: null,
      alternatives: [],
      unresolvedKanji: true,
    }
  }

  if (
    /[ァ-ヶｦ-ﾟ]/.test(raw) ||
    raw === "(ｶ)" ||
    raw === "(ﾕ)" ||
    raw === "(カ)" ||
    raw === "(ユ)"
  ) {
    const chosen = kanaOption(raw)
    return { raw, script: "kana", chosen, alternatives: [chosen], unresolvedKanji: false }
  }

  return { raw, script, chosen: null, alternatives: [], unresolvedKanji: false }
}

export function convert(input: string, options: ConvertOptions = {}): ConvertResult {
  const maxBytes = options.maxBytes ?? ZENGIN_MAX_BYTES
  const detected = detectScript(input)
  if (detected === "empty") {
    return {
      input,
      detected,
      tokens: [],
      katakana: "",
      zengin: {
        value: "",
        fullValue: "",
        bytes: 0,
        maxBytes,
        truncated: false,
        stripped: [],
      },
      english: { display: "", uppercase: "", romaji: "" },
      issues: [],
    }
  }

  const expanded = expandCompanySuffixes(input)
  const pieces = tokenize(expanded.text)
  const tokens = pieces.map((raw) =>
    resolveToken(
      raw,
      options.morphologicalReadings,
      options.direction ?? "auto",
    ),
  )

  if (options.selections) {
    for (let i = 0; i < tokens.length; i++) {
      const idx = options.selections[i]
      const token = tokens[i]
      if (idx != null && token.alternatives[idx]) {
        token.chosen = token.alternatives[idx]
      }
    }
  }

  const kanaParts = tokens.map((t) => t.chosen?.kana ?? "").filter(Boolean)
  const katakana = kanaParts.join(" ")
  const zengin = foldZengin(katakana, maxBytes)

  const romajiParts = tokens.map((t) => t.chosen?.romaji ?? titleCaseName(t.raw))
  const romaji = romajiParts.join(" ").replace(/ {2,}/g, " ").trim()
  const display = titleCaseName(romaji)
  const uppercase = passportUpper(romaji)

  const issues: Issue[] = [...zenginIssues(zengin)]
  if (tokens.some((t) => t.unresolvedKanji)) {
    issues.push({
      code: "kanji_unresolved",
      detail:
        "Some kanji are not in the name dictionaries. Load the kuromoji reading fallback or enter kana.",
    })
  }
  if (
    tokens.some(
      (t) =>
        t.chosen?.source === "morphological" ||
        (t.alternatives.length > 1 && t.script === "kanji"),
    )
  ) {
    issues.push({
      code: "kanji_reading_uncertain",
      detail: "Confirm this reading against the account’s registered 名義カナ.",
    })
  }

  return {
    input,
    detected,
    tokens,
    katakana,
    zengin,
    english: { display, uppercase, romaji },
    issues,
  }
}

export function applyKatakanaOverride(
  katakana: string,
  maxBytes: number = ZENGIN_MAX_BYTES,
): ConvertResult["zengin"] {
  return foldZengin(katakana, maxBytes)
}
