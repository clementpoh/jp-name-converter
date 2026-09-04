export type SuffixRule = {
  pattern: RegExp
  kana: string
  latin: string
}

export const COMPANY_SUFFIXES: SuffixRule[] = [
  {
    pattern: /\b(incorporated|inc\.?)\b/gi,
    kana: "インコーポレイテッド",
    latin: "Inc",
  },
  {
    pattern: /\b(limited|ltd\.?)\b/gi,
    kana: "リミテッド",
    latin: "Ltd",
  },
  {
    pattern: /\b(corporation|corp\.?)\b/gi,
    kana: "コーポレーション",
    latin: "Corp",
  },
  { pattern: /\bllc\b/gi, kana: "エルエルシー", latin: "LLC" },
  { pattern: /\bplc\b/gi, kana: "ピーエルシー", latin: "PLC" },
  { pattern: /\bgmbh\b/gi, kana: "ゲーエムベーハー", latin: "GmbH" },
  { pattern: /\bco\.?\b/gi, kana: "カンパニー", latin: "Co" },
  { pattern: /\bkk\b/gi, kana: "カブシキガイシャ", latin: "KK" },
  {
    pattern: /株式会社/g,
    kana: "(カ)",
    latin: "KK",
  },
  { pattern: /有限会社/g, kana: "(ユ)", latin: "Yugen" },
]

export function matchCompanySuffix(token: string): SuffixRule | null {
  for (const rule of COMPANY_SUFFIXES) {
    const flags = rule.pattern.flags.replace("g", "")
    const anchored = new RegExp(`^(?:${rule.pattern.source})$`, flags)
    if (anchored.test(token)) return rule
  }
  return null
}

export function expandCompanySuffixes(text: string): {
  text: string
  hit: boolean
} {
  let next = text
  let hit = false
  for (const rule of COMPANY_SUFFIXES) {
    if (!/[\u4e00-\u9fff]/.test(rule.pattern.source)) continue
    const replaced = next.replace(rule.pattern, ` ${rule.kana} `)
    if (replaced !== next) hit = true
    next = replaced
  }
  return { text: next.replace(/ {2,}/g, " ").trim(), hit }
}
