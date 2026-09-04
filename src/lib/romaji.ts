import { toRomaji } from "wanakana"

export function kanaToRomaji(kana: string): string {
  return toRomaji(kana, { upcaseKatakana: false })
    .replace(/['']/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function titleCaseName(romaji: string): string {
  return romaji
    .toLowerCase()
    .split(/([\s.]+)/)
    .map((part) => {
      if (!part || /^[\s.]+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join("")
}

export function passportUpper(romaji: string): string {
  return romaji
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ./\-(),]/g, "")
    .toUpperCase()
    .replace(/ {2,}/g, " ")
    .trim()
}
