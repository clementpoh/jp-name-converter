import { toKatakana } from "wanakana"

const VOWELS = "aeiou"

/**
 * Approximate English spelling as Japanese-friendly romaji, then katakana.
 * Used only after dictionary and clean-romaji miss.
 */
export function englishToKatakana(word: string): string {
  const approx = englishToRomajiApprox(word)
  const kana = toKatakana(approx)
  return kana.replace(/[A-Za-z]/g, "")
}

export function isCleanRomaji(word: string): boolean {
  const s = word.trim().toLowerCase().replace(/['’\-]/g, "")
  if (!s || !/^[a-z]+$/.test(s)) return false
  if (/[qxc]/.test(s) && !/shi|chi|tsu|cha|cho|chu/.test(s)) {
    if (/q|xx|ck|th|ph|wh/.test(s)) return false
  }
  if (/th|ph|wh|ck|tion|ght|kn|wr/.test(s)) return false
  const kana = toKatakana(s)
  return kana.length > 0 && !/[A-Za-z]/.test(kana)
}

function englishToRomajiApprox(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z]/g, "")
  if (!s) return ""

  s = s.replace(/tion/g, "shon")
  s = s.replace(/sion/g, "zhon")
  s = s.replace(/ture/g, "cha")
  s = s.replace(/ough/g, "o")
  s = s.replace(/augh/g, "o")
  s = s.replace(/igh/g, "ai")
  s = s.replace(/ght/g, "t")
  s = s.replace(/^kn/g, "n")
  s = s.replace(/^wr/g, "r")
  s = s.replace(/^wh/g, "w")
  s = s.replace(/qu/g, "kw")
  s = s.replace(/ph/g, "f")
  s = s.replace(/th/g, "s")
  s = s.replace(/ck/g, "k")
  s = s.replace(/sch/g, "sh")
  s = s.replace(/dg/g, "j")
  s = s.replace(/x/g, "ks")
  s = s.replace(/q/g, "k")
  s = s.replace(/c(?=[eiy])/g, "s")
  s = s.replace(/c/g, "k")
  s = s.replace(/g(?=[eiy])/g, "j")
  s = s.replace(/le$/g, "l")
  s = s.replace(/v/g, "b")
  s = s.replace(/l/g, "r")
  s = s.replace(/w/g, "w")
  s = s.replace(/y/g, "i")
  s = s.replace(/([aeiou])\1/g, "$1")

  // Silent e: cake -> kake already; name-final e after consonant
  s = s.replace(/([bcdfghjklmnpqrstvwxyz])e$/g, "$1")

  // Insert vowels between consonant clusters Japanese cannot say
  s = s.replace(/n(?=[bmp])/g, "m")
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const next = s[i + 1] ?? ""
    out += ch
    if (!VOWELS.includes(ch) && ch !== "n" && ch !== "y") {
      if (next && !VOWELS.includes(next) && next !== "y") {
        if (!(ch === "t" && next === "s") && !(ch === "s" && next === "h")) {
          out += "u"
        }
      }
    }
  }
  if (out.length && !VOWELS.includes(out.at(-1)!) && out.at(-1) !== "n") {
    out += "u"
  }
  return out
}
