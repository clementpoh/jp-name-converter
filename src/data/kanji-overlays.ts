import type { Origin } from "@/lib/types"

export type OverlayReading = {
  kana: string
  origin: Origin
  romaji: string
}

/** Same kanji, different payment-relevant readings (JP / KR / CN). */
export const KANJI_OVERLAYS: Record<string, OverlayReading[]> = {
  金: [
    { kana: "キン", origin: "japanese", romaji: "Kin" },
    { kana: "キム", origin: "korean", romaji: "Kim" },
    { kana: "ジン", origin: "chinese", romaji: "Jin" },
  ],
  李: [
    { kana: "リ", origin: "japanese", romaji: "Ri" },
    { kana: "イ", origin: "korean", romaji: "Lee" },
    { kana: "リー", origin: "chinese", romaji: "Li" },
  ],
  朴: [
    { kana: "ボク", origin: "japanese", romaji: "Boku" },
    { kana: "パク", origin: "korean", romaji: "Park" },
  ],
  崔: [
    { kana: "サイ", origin: "japanese", romaji: "Sai" },
    { kana: "チェ", origin: "korean", romaji: "Choi" },
  ],
  張: [
    { kana: "チョウ", origin: "japanese", romaji: "Cho" },
    { kana: "チャン", origin: "chinese", romaji: "Zhang" },
  ],
  王: [
    { kana: "オウ", origin: "japanese", romaji: "O" },
    { kana: "ワン", origin: "chinese", romaji: "Wang" },
  ],
  林: [
    { kana: "ハヤシ", origin: "japanese", romaji: "Hayashi" },
    { kana: "リム", origin: "korean", romaji: "Lim" },
    { kana: "リン", origin: "chinese", romaji: "Lin" },
  ],
  鄭: [
    { kana: "テイ", origin: "japanese", romaji: "Tei" },
    { kana: "チョン", origin: "korean", romaji: "Jeong" },
    { kana: "ジェン", origin: "chinese", romaji: "Zheng" },
  ],
  黄: [
    { kana: "コウ", origin: "japanese", romaji: "Ko" },
    { kana: "ファン", origin: "korean", romaji: "Hwang" },
    { kana: "ホアン", origin: "chinese", romaji: "Huang" },
  ],
  劉: [
    { kana: "リュウ", origin: "japanese", romaji: "Ryu" },
    { kana: "リウ", origin: "chinese", romaji: "Liu" },
  ],
  陳: [
    { kana: "チン", origin: "japanese", romaji: "Chin" },
    { kana: "チン", origin: "korean", romaji: "Jin" },
    { kana: "チェン", origin: "chinese", romaji: "Chen" },
  ],
}

export const JP_COMMON: Record<string, { kana: string; romaji: string }[]> = {
  山田: [{ kana: "ヤマダ", romaji: "Yamada" }],
  太郎: [{ kana: "タロウ", romaji: "Taro" }],
  佐藤: [{ kana: "サトウ", romaji: "Sato" }],
  鈴木: [{ kana: "スズキ", romaji: "Suzuki" }],
  高橋: [{ kana: "タカハシ", romaji: "Takahashi" }],
  田中: [{ kana: "タナカ", romaji: "Tanaka" }],
  渡辺: [{ kana: "ワタナベ", romaji: "Watanabe" }],
  伊藤: [{ kana: "イトウ", romaji: "Ito" }],
  山本: [{ kana: "ヤマモト", romaji: "Yamamoto" }],
  中村: [{ kana: "ナカムラ", romaji: "Nakamura" }],
  小林: [{ kana: "コバヤシ", romaji: "Kobayashi" }],
  加藤: [{ kana: "カトウ", romaji: "Kato" }],
  吉田: [{ kana: "ヨシダ", romaji: "Yoshida" }],
  花子: [{ kana: "ハナコ", romaji: "Hanako" }],
  一郎: [{ kana: "イチロウ", romaji: "Ichiro" }],
  株式会社: [{ kana: "カブシキガイシャ", romaji: "Kabushiki Gaisha" }],
}
