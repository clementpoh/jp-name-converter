#!/usr/bin/env node
/**
 * Build a compact person-name extract from ENAMDICT (EDRDG).
 * Input: /tmp/enamdictu.gz (UTF-8 ENAMDICT)
 * Output: public/data/enamdict-people.json
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs"
import { createGunzip } from "node:zlib"
import readline from "node:readline"

const PERSON_TYPES = new Set(["s", "g", "f", "m", "u", "h"])
const TYPE_MAP = {
  s: "surname",
  g: "given",
  f: "given",
  m: "given",
  u: "person",
  h: "person",
}

function hiraganaToKatakana(s) {
  return s.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  )
}

function stripMacrons(s) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ūū]/g, "u")
    .replace(/[ōō]/g, "o")
}

function firstRomaji(gloss) {
  const cleaned = gloss
    .replace(/^\([^)]*\)\s*/, "")
    .split("/")[0]
    .split(",")[0]
    .split("(")[0]
    .trim()
  if (!cleaned || /[\u3000-\u9fff]/.test(cleaned)) return ""
  if (!/^[A-Za-zĀ-ū'’ .\-]+$/.test(cleaned) && !/^[A-Za-z]/.test(cleaned)) {
    return ""
  }
  const ascii = stripMacrons(cleaned).replace(/['’]/g, "")
  const word = ascii.split(/\s+/)[0]
  return word.replace(/[^A-Za-z.\-]/g, "")
}

const lineRe = /^(\S+?)(?:\s+\[([^\]]+)\])?\s+\/(.*?)\/\s*$/

const kanji = new Map()
const latin = new Map()
let kept = 0
let skipped = 0

const input = createReadStream("/tmp/enamdictu.gz").pipe(createGunzip())
const rl = readline.createInterface({ input, crlfDelay: Infinity })

for await (const line of rl) {
  if (!line || line.startsWith("　？？？")) continue
  const m = line.match(lineRe)
  if (!m) {
    skipped++
    continue
  }
  const [, head, readingRaw, rest] = m
  const typeMatch = rest.match(/^\(([a-z]+)\)/)
  const type = typeMatch?.[1]
  if (!type || !PERSON_TYPES.has(type)) {
    skipped++
    continue
  }
  const kanaSrc = readingRaw || head
  if (!kanaSrc) {
    skipped++
    continue
  }
  const kana = hiraganaToKatakana(kanaSrc).replace(/・/g, "")
  if (!kana || /[\u4e00-\u9fff]/.test(kana)) {
    skipped++
    continue
  }
  const kind = TYPE_MAP[type]
  const hasKanji = /[\u4e00-\u9fff々〆〻]/.test(head)
  if (hasKanji) {
    const list = kanji.get(head) ?? []
    if (!list.some((e) => e.k === kana)) {
      list.push({ k: kana, t: kind })
      kanji.set(head, list)
    }
  }
  const romaji = firstRomaji(rest)
  if (romaji && romaji.length > 1) {
    const key = romaji.toLowerCase()
    const list = latin.get(key) ?? []
    if (!list.some((e) => e.k === kana)) {
      list.push({ k: kana, t: kind })
      latin.set(key, list)
    }
  }
  kept++
}

function mapToObj(map, maxAlts = 6) {
  const obj = {}
  for (const [key, value] of map) {
    obj[key] = value.slice(0, maxAlts)
  }
  return obj
}

const out = {
  attribution:
    "ENAMDICT/JMnedict © Electronic Dictionary Research and Development Group, used under a Creative Commons Attribution-ShareAlike licence.",
  kanji: mapToObj(kanji),
  latin: mapToObj(latin, 4),
}

mkdirSync("public/data", { recursive: true })
const json = JSON.stringify(out)
writeFileSync("public/data/enamdict-people.json", json)
console.log(
  JSON.stringify(
    {
      kept,
      skipped,
      kanjiKeys: kanji.size,
      latinKeys: latin.size,
      bytes: json.length,
    },
    null,
    2,
  ),
)
