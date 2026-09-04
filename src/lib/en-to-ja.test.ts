import { describe, it, expect } from "vitest"
import { convert } from "@/lib/convert"
import { englishToKatakana, isCleanRomaji } from "@/lib/phonetic"

/**
 * Names deliberately absent from the dictionary, so each one exercises the
 * phonetic fallback rather than a lookup.
 */
const PHONETIC: Array<[string, string]> = [
  ["mike", "マイク"],
  ["kate", "ケイト"],
  ["dave", "デイブ"],
  ["jane", "ジェーン"],
  ["pete", "ピート"],
  ["steve", "スティーブ"],
  ["rose", "ローズ"],
  ["luke", "ルーク"],
  ["paul", "ポール"],
  ["george", "ジョージ"],
  ["smith", "スミス"],
  ["charles", "チャールズ"],
  ["robert", "ロバート"],
  ["taylor", "テイラー"],
  ["walker", "ウォーカー"],
  ["brown", "ブラウン"],
  ["wright", "ライト"],
  ["lee", "リー"],
  ["lisa", "リサ"],
  ["laura", "ローラ"],
  ["leo", "レオ"],
  ["jack", "ジャック"],
  ["scott", "スコット"],
  ["bruce", "ブルース"],
  ["june", "ジューン"],
  ["duke", "デューク"],
  ["alex", "アレックス"],
  ["chris", "クリス"],
  ["john", "ジョン"],
  ["mark", "マーク"],
  ["turner", "ターナー"],
  ["snow", "スノー"],
  ["house", "ハウス"],
  ["clark", "クラーク"],
  ["frank", "フランク"],
  ["grant", "グラント"],
  ["stone", "ストーン"],
  ["blake", "ブレイク"],
  ["quinn", "クイン"],
  ["nelson", "ネルソン"],
  ["harper", "ハーパー"],
  ["morgan", "モーガン"],
  ["gordon", "ゴードン"],
  ["hunter", "ハンター"],
  ["preston", "プレストン"],
  ["sullivan", "サリバン"],
  ["marshall", "マーシャル"],
  ["bennett", "ベネット"],
  ["dawson", "ドーソン"],
  ["ellis", "エリス"],
  ["foster", "フォスター"],
  ["gibson", "ギブソン"],
  ["holt", "ホルト"],
  ["irving", "アービング"],
  ["jenkins", "ジェンキンス"],
  ["kendall", "ケンダル"],
  ["lambert", "ランバート"],
  ["mercer", "マーサー"],
  ["norton", "ノートン"],
  ["osborne", "オズボーン"],
  ["palmer", "パーマー"],
  ["reeves", "リーブス"],
  ["sanders", "サンダース"],
  ["tucker", "タッカー"],
  ["vaughn", "ボーン"],
  ["warner", "ワーナー"],
  ["young", "ヤング"],
]

describe("english to katakana fallback", () => {
  for (const [input, want] of PHONETIC) {
    it(`reads ${input} as ${want}`, () => {
      expect(englishToKatakana(input)).toBe(want)
    })
  }
})

describe("clean romaji detection", () => {
  it("accepts real romaji", () => {
    for (const word of ["yamada", "tarou", "suzuki", "kenji", "ookubo"]) {
      expect(isCleanRomaji(word)).toBe(true)
    }
  })

  // wanakana maps la/li/lu/le/lo to the small kana ァィゥェォ, which used to
  // slip through and produce readings like ゥケ for Luke.
  it("rejects spellings using letters romaji never has", () => {
    for (const word of ["luke", "lee", "lisa", "laura", "leo", "alex", "dave"]) {
      expect(isCleanRomaji(word)).toBe(false)
    }
  })
})

describe("regional name coverage", () => {
  const cases: Array<[string, string]> = [
    ["Zhang Wei", "チャン ウェイ"],
    ["Kwok Ming", "クォック ミン"],
    ["Park Jimin", "パク チミン"],
    ["Choi Eunji", "チェ ウンジ"],
    ["Nguyen Van Minh", "グエン バン ミン"],
    ["Tran Thi Hoa", "チャン ティ ホア"],
    ["Rodel Villanueva", "ロデル ビリャヌエバ"],
    ["Jose Bautista", "ホセ バウティスタ"],
    ["Rajesh Sharma", "ラジェシュ シャルマ"],
    ["Priya Nair", "プリヤ ナイル"],
  ]
  for (const [input, want] of cases) {
    it(`converts ${input}`, () => {
      expect(convert(input, { direction: "en-to-ja" }).katakana).toBe(want)
    })
  }
})
