import { toKatakana } from "wanakana"

/**
 * Approximate an English spelling as katakana.
 *
 * Runs in two stages: English orthography is rewritten into a small phoneme
 * alphabet, then that alphabet is rendered as morae. A single pass of regex
 * substitutions cannot do this correctly, because Japanese is mora-timed —
 * whether a consonant joins the following vowel or takes an epenthetic one
 * depends on what comes after it.
 *
 * Used only after the dictionary and clean-romaji paths miss.
 */
export function englishToKatakana(word: string): string {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "")
  if (!cleaned) return ""
  return render(toPhonemes(prepare(cleaned)))
}

/** Letters that never appear in Hepburn or Kunrei romaji for Japanese. */
const NON_ROMAJI = /[lvqx]/

export function isCleanRomaji(word: string): boolean {
  const s = word.trim().toLowerCase().replace(/['’\-]/g, "")
  if (!s || !/^[a-z]+$/.test(s)) return false
  // wanakana reads la/li/lu/le/lo as the small-kana escape (ァィゥェォ), so
  // without this guard every L-name passes the "no latin left" check below
  // and comes out mangled: luke -> ゥケ, lee -> ェエ, lisa -> ィサ.
  if (NON_ROMAJI.test(s)) return false
  if (/[qxc]/.test(s) && !/shi|chi|tsu|cha|cho|chu/.test(s)) {
    if (/q|xx|ck|th|ph|wh/.test(s)) return false
  }
  if (/th|ph|wh|ck|tion|ght|kn|wr/.test(s)) return false
  const kana = toKatakana(s)
  return kana.length > 0 && !/[A-Za-z]/.test(kana)
}

/**
 * Rewrite word-final spellings whose pronunciation depends on the whole word,
 * so the left-to-right scan in toPhonemes can stay context-free.
 * Long vowels are marked with uppercase letters: A=ei I=ai O=ou U=yuu W=uu E=ii
 */
function prepare(word: string): string {
  let s = word

  // Each rule below only fires on a lone vowel, never on the second half of a
  // digraph, so that house keeps its "ou" instead of being read as u + silent e.
  // Silent-e plurals, which voice the s: charles -> チャールズ, jones -> ジョーンズ.
  s = s.replace(
    /(^|[^aeiou])([aeiou])([bcdfgklmnprstvz])es$/,
    (_m, p: string, v: string, c: string) => `${p}${magic(v)}${c}Z`,
  )
  s = s.replace(/([bcdfgklmnprstvz])es$/, "$1Z")
  // -ce and -ge soften, and still lengthen the vowel before them.
  s = s.replace(
    /(^|[^aeiou])([aeiou])ce$/,
    (_m, p: string, v: string) => `${p}${magic(v)}s`,
  )
  s = s.replace(
    /(^|[^aeiou])([aeiou])ge$/,
    (_m, p: string, v: string) => `${p}${magic(v)}j`,
  )
  // Voiced -se ending: rose, jose, wise.
  s = s.replace(
    /(^|[^aeiou])([aeiou])se$/,
    (_m, p: string, v: string) => `${p}${magic(v)}z`,
  )
  // Magic e: kate -> kAt, mike -> mIk, pete -> pEt, luke -> lUk.
  s = s.replace(
    /(^|[^aeiou])([aeiou])([bdfgklmnprstvz])e$/,
    (_m, p: string, v: string, c: string) => `${p}${magic(v)}${c}`,
  )
  // yuu vs uu depends on the onset: duke -> デューク but luke -> ルーク.
  s = s.replace(/([lrjy]|ch|sh)U/, (_m, c: string) => `${c}W`)
  // Remaining silent e.
  s = s.replace(/ce$/, "s").replace(/ge$/, "j")
  // -ves stays voiceless in katakana convention: reeves -> リーブス.
  s = s.replace(/vZ$/, "vs")
  s = s.replace(/([bcdfghjklmnprstvwxz])e$/, "$1")

  return s
}

function magic(vowel: string): string {
  return { a: "A", i: "I", o: "O", u: "U", e: "E" }[vowel] ?? vowel
}

type Rule = [RegExp, string[]]

/**
 * Ordered longest-match rules. "Q" marks a geminate (っ); uppercase entries are
 * vowel nuclei, lowercase are consonants.
 */
const RULES: Rule[] = [
  // Word-final chunks.
  [/tion$/, ["sh", "o", "n"]],
  [/sion$/, ["j", "o", "n"]],
  [/cian$/, ["sh", "a", "n"]],
  [/ture$/, ["ch", "AR"]],
  [/sure$/, ["j", "AR"]],
  [/ough$/, ["OU"]],
  [/augh$/, ["AW"]],
  [/eigh/, ["A"]],
  [/ight/, ["I", "t"]],
  [/ey$/, ["E"]],
  [/ie$/, ["E"]],
  [/y$/, ["E"]],

  // Doubled consonants: geminate for stops, single for the rest.
  [/tt/, ["Q", "t"]],
  [/pp/, ["Q", "p"]],
  [/kk/, ["Q", "k"]],
  [/cc/, ["Q", "k"]],
  [/dd/, ["Q", "d"]],
  [/gg/, ["Q", "g"]],
  [/bb/, ["Q", "b"]],
  [/zz/, ["Q", "ts"]],
  [/ss/, ["s"]],
  [/ll/, ["r"]],
  [/nn/, ["n"]],
  [/mm/, ["m"]],
  [/ff/, ["f"]],
  [/rr/, ["r"]],

  // Consonant digraphs.
  [/^kn/, ["n"]],
  [/^wr/, ["r"]],
  [/^ps/, ["s"]],
  [/sch/, ["sh"]],
  [/ch(?=r)/, ["k"]],
  [/ch/, ["ch"]],
  [/sh/, ["sh"]],
  [/ph/, ["f"]],
  [/th/, ["th"]],
  [/wh/, ["w"]],
  [/ck/, ["Q", "k"]],
  [/gh/, []],
  // h is silent before another consonant and word-finally: john, sarah.
  [/h(?=[bcdfgjklmnpqrstvwxyz])/, []],
  [/h$/, []],
  // Softened c/g keeping their vowel silent: george, geoff.
  [/ge(?=o)/, ["j"]],
  [/ce(?=o)/, ["s"]],
  [/qu/, ["kw"]],
  [/^x/, ["z"]],
  [/x/, ["Q", "k", "s"]],
  [/dg/, ["j"]],

  // r-controlled vowels.
  // Silent l: walk is ウォーク but palm is パーム.
  [/al(?=k)/, ["AW"]],
  [/al(?=[mf])/, ["AR"]],
  [/ar(?![aeiouy])/, ["AR"]],
  // Unstressed -or agentive suffix is アー, not オー: taylor, connor.
  [/or$/, ["ER"]],
  [/or(?![aeiouy])/, ["OR"]],
  [/er(?![aeiouy])/, ["ER"]],
  [/ir(?![aeiouy])/, ["ER"]],
  [/ur(?![aeiouy])/, ["ER"]],
  [/yr(?![aeiouy])/, ["ER"]],

  // Vowel digraphs.
  [/ee/, ["E"]],
  [/ea/, ["E"]],
  [/oo/, ["W"]],
  [/ou(?=ng)/, ["a"]],
  [/ou/, ["AU"]],
  [/ow$/, ["OU"]],
  [/ow/, ["AU"]],
  [/oa/, ["OU"]],
  [/ai/, ["A"]],
  [/ay/, ["A"]],
  [/oi/, ["OI"]],
  [/oy/, ["OI"]],
  [/au/, ["AW"]],
  [/aw/, ["AW"]],
  [/ei/, ["A"]],
  [/eu/, ["U"]],

  // Context-sensitive singles.
  [/c(?=[eiy])/, ["s"]],
  [/c/, ["k"]],
  // Soft g before e/y only: gibson, gilbert and gill all take a hard g.
  [/g(?=[ey])/, ["j"]],
  // Short u in a closed syllable is /ʌ/: hunter, sullivan, tucker.
  [/u(?=[bcdfgklmnpqrstvwxz]{2})/, ["a"]],
  [/u(?=[bcdfgklmnpqrstvwxz]$)/, ["a"]],
  // s voices before a voiced consonant: osborne -> オズボーン.
  [/(?<=[aeiou])s(?=[bdgv])/, ["z"]],
  [/y(?=[aeiou])/, ["y"]],
  [/y/, ["i"]],
  [/l/, ["r"]],
  [/v/, ["v"]],
  [/j/, ["j"]],

  // Long-vowel markers produced by prepare().
  [/A/, ["A"]],
  [/I/, ["I"]],
  [/O/, ["O"]],
  [/U/, ["U"]],
  [/W/, ["W"]],
  [/E/, ["E"]],
  [/Z/, ["z"]],

  // Plain letters.
  [/a/, ["a"]],
  [/i/, ["i"]],
  [/u/, ["u"]],
  [/e/, ["e"]],
  [/o/, ["o"]],
  [/b/, ["b"]],
  [/d/, ["d"]],
  [/f/, ["f"]],
  [/g/, ["g"]],
  [/h/, ["h"]],
  [/k/, ["k"]],
  [/m/, ["m"]],
  [/n/, ["n"]],
  [/p/, ["p"]],
  [/r/, ["r"]],
  [/s/, ["s"]],
  [/t/, ["t"]],
  [/w/, ["w"]],
  [/z/, ["z"]],
]

function toPhonemes(word: string): string[] {
  const out: string[] = []
  let i = 0
  outer: while (i < word.length) {
    for (const [pattern, tokens] of RULES) {
      const sticky = new RegExp(pattern.source, "y")
      sticky.lastIndex = i
      const m = sticky.exec(word)
      // A rule anchored with $ must also finish the word.
      if (!m) continue
      if (pattern.source.endsWith("$") && sticky.lastIndex !== word.length) {
        continue
      }
      out.push(...tokens)
      i = sticky.lastIndex
      continue outer
    }
    i += 1
  }
  // "a_e" closed by a final n is conventionally エー, not エイ: jane, shane.
  for (let j = 0; j < out.length - 1; j++) {
    if (out[j] === "A" && out[j + 1] === "n" && !NUCLEI[out[j + 2] ?? ""]) {
      out[j] = "AN"
    }
  }
  return out
}

/** base vowel used to pick the CV kana, plus any trailing mora. */
const NUCLEI: Record<string, { base: string; tail: string; palatal?: boolean }> = {
  a: { base: "a", tail: "" },
  i: { base: "i", tail: "" },
  u: { base: "u", tail: "" },
  e: { base: "e", tail: "" },
  o: { base: "o", tail: "" },
  A: { base: "e", tail: "イ" },
  AN: { base: "e", tail: "ー" },
  I: { base: "a", tail: "イ" },
  O: { base: "o", tail: "ー" },
  E: { base: "i", tail: "ー" },
  W: { base: "u", tail: "ー" },
  U: { base: "u", tail: "ー", palatal: true },
  AI: { base: "a", tail: "イ" },
  OI: { base: "o", tail: "イ" },
  AU: { base: "a", tail: "ウ" },
  AW: { base: "o", tail: "ー" },
  AR: { base: "a", tail: "ー" },
  ER: { base: "a", tail: "ー" },
  OR: { base: "o", tail: "ー" },
  OU: { base: "o", tail: "ー" },
}

const KANA: Record<string, Record<string, string>> = {
  "": { a: "ア", i: "イ", u: "ウ", e: "エ", o: "オ" },
  k: { a: "カ", i: "キ", u: "ク", e: "ケ", o: "コ" },
  g: { a: "ガ", i: "ギ", u: "グ", e: "ゲ", o: "ゴ" },
  s: { a: "サ", i: "シ", u: "ス", e: "セ", o: "ソ" },
  z: { a: "ザ", i: "ジ", u: "ズ", e: "ゼ", o: "ゾ" },
  t: { a: "タ", i: "ティ", u: "トゥ", e: "テ", o: "ト" },
  d: { a: "ダ", i: "ディ", u: "ドゥ", e: "デ", o: "ド" },
  n: { a: "ナ", i: "ニ", u: "ヌ", e: "ネ", o: "ノ" },
  h: { a: "ハ", i: "ヒ", u: "フ", e: "ヘ", o: "ホ" },
  b: { a: "バ", i: "ビ", u: "ブ", e: "ベ", o: "ボ" },
  p: { a: "パ", i: "ピ", u: "プ", e: "ペ", o: "ポ" },
  m: { a: "マ", i: "ミ", u: "ム", e: "メ", o: "モ" },
  y: { a: "ヤ", i: "イ", u: "ユ", e: "イェ", o: "ヨ" },
  r: { a: "ラ", i: "リ", u: "ル", e: "レ", o: "ロ" },
  w: { a: "ワ", i: "ウィ", u: "ウ", e: "ウェ", o: "ウォ" },
  f: { a: "ファ", i: "フィ", u: "フ", e: "フェ", o: "フォ" },
  v: { a: "バ", i: "ビ", u: "ブ", e: "ベ", o: "ボ" },
  ch: { a: "チャ", i: "チ", u: "チュ", e: "チェ", o: "チョ" },
  sh: { a: "シャ", i: "シ", u: "シュ", e: "シェ", o: "ショ" },
  j: { a: "ジャ", i: "ジ", u: "ジュ", e: "ジェ", o: "ジョ" },
  ts: { a: "ツァ", i: "ツィ", u: "ツ", e: "ツェ", o: "ツォ" },
  th: { a: "サ", i: "シ", u: "ス", e: "セ", o: "ソ" },
  kw: { a: "クア", i: "クイ", u: "ク", e: "クエ", o: "クオ" },
}

/** Cyu forms, for the /juː/ in duke, cute, hugh. */
const PALATAL: Record<string, string> = {
  k: "キュ",
  g: "ギュ",
  s: "シュ",
  z: "ジュ",
  t: "テュ",
  d: "デュ",
  n: "ニュ",
  h: "ヒュ",
  b: "ビュ",
  p: "ピュ",
  m: "ミュ",
  r: "リュ",
  f: "フュ",
  v: "ビュ",
  "": "ユ",
}

const CODA: Record<string, string> = {
  k: "ク",
  g: "グ",
  s: "ス",
  z: "ズ",
  t: "ト",
  d: "ド",
  n: "ン",
  h: "フ",
  b: "ブ",
  p: "プ",
  m: "ム",
  r: "ル",
  w: "ウ",
  f: "フ",
  v: "ブ",
  y: "イ",
  ch: "チ",
  sh: "シュ",
  j: "ジ",
  ts: "ツ",
  th: "ス",
  kw: "ク",
}

function render(tokens: string[]): string {
  let out = ""
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === "Q") {
      // A geminate needs something to attach to.
      if (i + 1 < tokens.length) out += "ッ"
      i += 1
      continue
    }
    const nucleus = NUCLEI[token]
    if (nucleus) {
      out += KANA[""][nucleus.base] + nucleus.tail
      i += 1
      continue
    }
    const next = tokens[i + 1]
    const nextNucleus = next ? NUCLEI[next] : undefined
    if (nextNucleus) {
      out += syllable(token, nextNucleus)
      i += 2
      continue
    }
    // Consonant in a cluster or coda position.
    if (token === "m" && next && /^[bpm]$/.test(next)) {
      out += "ン"
    } else {
      out += CODA[token] ?? ""
    }
    i += 1
  }
  return out.replace(/ー+/g, "ー")
}

function syllable(
  onset: string,
  nucleus: { base: string; tail: string; palatal?: boolean },
): string {
  if (nucleus.palatal) {
    const palatal = PALATAL[onset]
    if (palatal) return palatal + nucleus.tail
  }
  const row = KANA[onset]
  if (!row) return nucleus.tail
  return row[nucleus.base] + nucleus.tail
}
