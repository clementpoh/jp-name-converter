import { toKatakana } from "wanakana"
import type { Issue, ZenginResult } from "./types"

export const ZENGIN_MAX_BYTES = 30

const KANA_TO_HALF: Record<string, string> = {
  ァ: "ｧ",
  ア: "ｱ",
  ィ: "ｨ",
  イ: "ｲ",
  ゥ: "ｩ",
  ウ: "ｳ",
  ェ: "ｪ",
  エ: "ｴ",
  ォ: "ｫ",
  オ: "ｵ",
  カ: "ｶ",
  ガ: "ｶﾞ",
  キ: "ｷ",
  ギ: "ｷﾞ",
  ク: "ｸ",
  グ: "ｸﾞ",
  ケ: "ｹ",
  ゲ: "ｹﾞ",
  コ: "ｺ",
  ゴ: "ｺﾞ",
  サ: "ｻ",
  ザ: "ｻﾞ",
  シ: "ｼ",
  ジ: "ｼﾞ",
  ス: "ｽ",
  ズ: "ｽﾞ",
  セ: "ｾ",
  ゼ: "ｾﾞ",
  ソ: "ｿ",
  ゾ: "ｿﾞ",
  タ: "ﾀ",
  ダ: "ﾀﾞ",
  チ: "ﾁ",
  ヂ: "ﾁﾞ",
  ッ: "ｯ",
  ツ: "ﾂ",
  ヅ: "ﾂﾞ",
  テ: "ﾃ",
  デ: "ﾃﾞ",
  ト: "ﾄ",
  ド: "ﾄﾞ",
  ナ: "ﾅ",
  ニ: "ﾆ",
  ヌ: "ﾇ",
  ネ: "ﾈ",
  ノ: "ﾉ",
  ハ: "ﾊ",
  バ: "ﾊﾞ",
  パ: "ﾊﾟ",
  ヒ: "ﾋ",
  ビ: "ﾋﾞ",
  ピ: "ﾋﾟ",
  フ: "ﾌ",
  ブ: "ﾌﾞ",
  プ: "ﾌﾟ",
  ヘ: "ﾍ",
  ベ: "ﾍﾞ",
  ペ: "ﾍﾟ",
  ホ: "ﾎ",
  ボ: "ﾎﾞ",
  ポ: "ﾎﾟ",
  マ: "ﾏ",
  ミ: "ﾐ",
  ム: "ﾑ",
  メ: "ﾒ",
  モ: "ﾓ",
  ャ: "ｬ",
  ヤ: "ﾔ",
  ュ: "ｭ",
  ユ: "ﾕ",
  ョ: "ｮ",
  ヨ: "ﾖ",
  ラ: "ﾗ",
  リ: "ﾘ",
  ル: "ﾙ",
  レ: "ﾚ",
  ロ: "ﾛ",
  ヮ: "ﾜ",
  ワ: "ﾜ",
  ヰ: "ｲ",
  ヱ: "ｴ",
  ヲ: "ｦ",
  ン: "ﾝ",
  ヴ: "ｳﾞ",
  ヵ: "ｶ",
  ヶ: "ｹ",
  ー: "ｰ",
  "・": ".",
  "　": " ",
}

/** Conservative 総合振込 受取人名 C(30) whitelist. */
const ALLOWED = new Set([
  " ",
  "(",
  ")",
  ".",
  "-",
  "/",
  ",",
  "ﾞ",
  "ﾟ",
  "ｰ",
  ... "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ...halfwidthKana(),
])

function halfwidthKana(): string[] {
  const chars: string[] = []
  for (let code = 0xff66; code <= 0xff9f; code++) {
    chars.push(String.fromCharCode(code))
  }
  return chars
}

export function isZenginChar(ch: string): boolean {
  return ALLOWED.has(ch)
}

export function toFullWidthKatakana(s: string): string {
  return toKatakana(s, { convertLongVowelMark: false })
}

export function toHalfWidthKatakana(input: string): string {
  let out = ""
  for (const ch of input) {
    if (KANA_TO_HALF[ch]) {
      out += KANA_TO_HALF[ch]
      continue
    }
    const code = ch.charCodeAt(0)
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0)
      continue
    }
    out += ch
  }
  return out
}

export function foldZengin(
  input: string,
  maxBytes: number = ZENGIN_MAX_BYTES,
): ZenginResult {
  const katakana = toFullWidthKatakana(input)
  let half = toHalfWidthKatakana(katakana)
  half = half.replace(/・/g, ".").replace(/\u3000/g, " ")
  half = half.toUpperCase()

  const stripped: string[] = []
  let cleaned = ""
  for (const ch of half) {
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      cleaned += " "
      continue
    }
    if (isZenginChar(ch)) {
      cleaned += ch
    } else if (ch.trim() === "") {
      cleaned += " "
    } else {
      stripped.push(ch)
    }
  }
  cleaned = cleaned.replace(/ {2,}/g, " ").trim()

  const truncated = cleaned.length > maxBytes
  const value = truncated ? cleaned.slice(0, maxBytes).trimEnd() : cleaned

  return {
    value,
    fullValue: cleaned,
    bytes: value.length,
    maxBytes,
    truncated,
    stripped: unique(stripped),
  }
}

export function zenginIssues(z: ZenginResult): Issue[] {
  const issues: Issue[] = []
  if (z.truncated) {
    issues.push({
      code: "overflow",
      detail: `Payment name is ${z.fullValue.length} bytes; Zengin 受取人名 allows ${z.maxBytes}.`,
    })
  }
  if (z.stripped.length) {
    issues.push({
      code: "illegal_char",
      detail: `Removed characters not allowed in Zengin: ${z.stripped.join(" ")}`,
    })
  }
  if (!z.value) {
    issues.push({
      code: "empty_after_normalize",
      detail: "Nothing remained after folding to half-width katakana.",
    })
  }
  return issues
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
