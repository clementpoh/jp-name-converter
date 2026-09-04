# JP Name Converter

Offline single-page prototype for **Japan payment beneficiary names**. Type a name in English or Japanese; the app folds it to the Zengin 総合振込 **受取人名** field (30 bytes of half-width katakana) and shows a latin/romaji line for records.

Zengin does **not** accept kanji in that field. The bank stores a legal kanji 口座名義 and a registered 名義カナ. This tool targets the kana. Confirm against the account before sending — it is not bank-of-record data.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43147](http://127.0.0.1:43147)

```bash
npm run build
npm run preview
```

```bash
npm test
```

After the first load, the service worker caches the app and the JMnedict person-name extract so conversion works with the network off.

## Single-file offline build

```bash
npm run build:single
```

Writes `dist-single/jp-name-converter.html` (~5 MB): one HTML file with the app,
Tailwind CSS, and the entire JMnedict extract base64-inlined. Open it directly
from disk (`file://`), email it, or drop it on a USB stick — no server, no
service worker, no network needed for the core convert flow.

Caveats for the single-file build:
- The optional kuromoji reading fallback still fetches ~17 MB from
  `cdn.jsdelivr.net` the first time it's used, so that specific button needs
  the network once. The rest of the app is fully offline.
- Because it's served from `file://`, PWA / service-worker features are
  disabled (they're not needed anyway — the whole app is one file).

## How conversion works

1. **Latin names** — conventional katakana table (Western, Korean, Chinese, Vietnamese, Japanese romaji), including variants such as `Kim`/`Gim`, `Lee`/`Yi`, `Wang`/`Wong`.
2. **Kanji names** — bundled common Japanese names plus an [ENAMDICT/JMnedict](https://www.edrdg.org/enamdict/enamdict_doc.html) person-name extract (surnames and given names). Homographs such as `金` offer JP/KR/CN readings.
3. **Romaji / phonetic fallback** — clean Japanese romaji via `wanakana`; otherwise an English-to-katakana approximation.
4. **Optional kuromoji** — not downloaded on first paint. Use **Load reading fallback (~17MB)** to fetch IPADic from jsDelivr. The service worker then caches it for offline use. Readings are tagged `morphological` and still marked uncertain.

Company suffixes (`Ltd`, `Inc`, `KK`, `株式会社`) are expanded before folding.

## Rebuild the name extract

Requires `enamdictu.gz` from EDRDG (HTTP is fine if the host certificate does not match):

```bash
curl -fsSL -o /tmp/enamdictu.gz http://ftp.edrdg.org/pub/Nihongo/enamdictu.gz
node scripts/build-enamdict.mjs
gzip -c public/data/enamdict-people.json > public/data/enamdict-people.json.gz
```

ENAMDICT/JMnedict is © Electronic Dictionary Research and Development Group, used under a Creative Commons Attribution-ShareAlike licence.

## API

This prototype has no server API. Conversion is `convert()` in `src/lib/convert.ts`.
