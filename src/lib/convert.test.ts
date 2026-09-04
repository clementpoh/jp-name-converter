import { describe, expect, it } from "vitest"
import { convert } from "./convert"
import { foldZengin, toHalfWidthKatakana } from "./zengin"

function hw(kana: string): string {
  return toHalfWidthKatakana(kana)
}

describe("beneficiary conversion", () => {
  it("maps John Smith from the latin dictionary to Zengin kana", () => {
    const result = convert("John Smith")
    expect(result.zengin.value).toBe(hw("ジョン スミス"))
    expect(result.zengin.bytes).toBeLessThanOrEqual(30)
    expect(result.tokens.every((t) => t.chosen?.source === "dictionary")).toBe(
      true,
    )
    expect(result.english.display).toBe("John Smith")
  })

  it("uses conventional katakana for Michael, not a naive phonetic miss", () => {
    expect(convert("Michael").zengin.value).toBe(hw("マイケル"))
  })

  it("maps Korean Kim and Vietnamese Nguyen", () => {
    expect(convert("Kim").zengin.value).toBe(hw("キム"))
    expect(convert("Nguyen").zengin.value).toBe(hw("グエン"))
  })

  it("maps Zhang to conventional Chinese katakana", () => {
    expect(convert("Zhang").zengin.value).toBe(hw("チャン"))
  })

  it("returns Korean and Chinese alternatives for Lee", () => {
    const alts = convert("Lee").tokens[0]?.alternatives ?? []
    const kana = alts.map((a) => a.kana)
    const origins = alts.map((a) => a.origin)
    expect(kana).toContain("イ")
    expect(kana).toContain("リー")
    expect(origins).toContain("korean")
    expect(origins).toContain("chinese")
  })

  it("returns JP/KR/CN readings for 金", () => {
    const alts = convert("金").tokens[0]?.alternatives ?? []
    expect(alts.map((a) => a.kana)).toEqual(
      expect.arrayContaining(["キン", "キム", "ジン"]),
    )
    expect(alts.map((a) => a.origin)).toEqual(
      expect.arrayContaining(["japanese", "korean", "chinese"]),
    )
  })

  it("treats Yamada Taro as Japanese romaji", () => {
    const result = convert("Yamada Taro")
    expect(result.zengin.value).toBe(hw("ヤマダ タロウ"))
    expect(
      result.tokens.every(
        (t) => t.chosen?.source === "dictionary" || t.chosen?.source === "romaji",
      ),
    ).toBe(true)
  })

  it("splits 山田太郎 via the bundled Japanese name table", () => {
    const result = convert("山田太郎")
    expect(result.tokens.map((t) => t.raw)).toEqual(["山田", "太郎"])
    expect(result.zengin.value).toBe(hw("ヤマダ タロウ"))
    expect(result.english.display.toLowerCase()).toContain("yamada")
    expect(result.english.display.toLowerCase()).toContain("taro")
    expect(result.english.display).toBe("Yamada Taro")
  })

  it("tags unknown latin as phonetic", () => {
    const result = convert("Xzqglorb")
    expect(result.tokens[0]?.chosen?.source).toBe("phonetic")
    expect(result.zengin.value.length).toBeGreaterThan(0)
  })

  it("leaves unknown kanji unresolved without inventing a reading", () => {
    const result = convert("魑魅")
    expect(result.tokens.some((t) => t.unresolvedKanji)).toBe(true)
    expect(result.issues.some((i) => i.code === "kanji_unresolved")).toBe(true)
    expect(result.tokens.every((t) => t.chosen?.source !== "morphological")).toBe(
      true,
    )
  })

  it("uses a morphological reading when kuromoji has already run", () => {
    const result = convert("魑魅", {
      morphologicalReadings: { 魑魅: "チミ" },
    })
    expect(result.tokens[0]?.chosen?.source).toBe("morphological")
    expect(result.issues.some((i) => i.code === "kanji_reading_uncertain")).toBe(
      true,
    )
  })

  it("round-trips half-width kana", () => {
    expect(convert("ﾔﾏﾀﾞ ﾀﾛｳ").zengin.value).toBe(hw("ヤマダ タロウ"))
  })

  it("expands Ltd and Inc company suffixes", () => {
    const ltd = convert("Acme Ltd")
    expect(ltd.katakana).toContain("リミテッド")
    expect(ltd.zengin.value).toContain(hw("リミテッド"))
    const inc = convert("Acme Inc")
    expect(inc.katakana).toContain("インコーポレイテッド")
    expect(ltd.english.display).toBe("Acme Ltd")
  })

  it("flags overflow over 30 bytes", () => {
    const result = convert("Michael Michael Michael Michael Michael Michael Michael")
    expect(result.zengin.truncated).toBe(true)
    expect(result.zengin.bytes).toBeLessThanOrEqual(30)
    expect(result.zengin.fullValue.length).toBeGreaterThan(30)
    expect(result.issues.some((i) => i.code === "overflow")).toBe(true)
  })

  it("lists illegal characters that were stripped", () => {
    const result = foldZengin("ジョン★スミス")
    expect(result.stripped).toContain("★")
    expect(result.value.includes("★")).toBe(false)
  })
})
