import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Loader2,
  WifiOff,
  Wifi,
  BookOpen,
  AlertTriangle,
  Languages,
} from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/input"
import { applyKatakanaOverride, convert } from "@/lib/convert"
import { loadEnamdict } from "@/lib/dictionaries"
import { isKuromojiReady, loadKuromoji, readingWithKuromoji } from "@/lib/kuromoji"
import { cn } from "@/lib/utils"
import type { Direction } from "@/lib/types"

const EXAMPLES = [
  "John Smith",
  "Yamada Taro",
  "山田太郎",
  "Kim Minjun",
  "Wang Wei",
  "Nguyen",
  "Acme Ltd",
  "金",
  "Lee",
]

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  return online
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function App() {
  const [input, setInput] = useState("")
  const [direction, setDirection] = useState<Direction>("auto")
  const [selections, setSelections] = useState<Array<number | undefined>>([])
  const [override, setOverride] = useState<string | null>(null)
  const [dictReady, setDictReady] = useState(false)
  const [dictError, setDictError] = useState<string | null>(null)
  const [kuroReady, setKuroReady] = useState(isKuromojiReady())
  const [kuroLoading, setKuroLoading] = useState(false)
  const [kuroProgress, setKuroProgress] = useState(0)
  const [kuroError, setKuroError] = useState<string | null>(null)
  const [morph, setMorph] = useState<Record<string, string>>({})
  const [morphBusy, setMorphBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [pwaReady, setPwaReady] = useState(false)
  const online = useOnline()

  useEffect(() => {
    loadEnamdict()
      .then((data) => {
        setDictReady(Boolean(data))
        if (!data) setDictError("Name dictionary extract did not load.")
      })
      .catch(() => setDictError("Name dictionary extract did not load."))
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setPwaReady(true)).catch(() => {})
    }
  }, [])

  const result = useMemo(
    () =>
      convert(input, {
        direction,
        selections,
        morphologicalReadings: morph,
      }),
    [input, direction, selections, morph, dictReady],
  )

  const zengin = override
    ? applyKatakanaOverride(override)
    : result.zengin

  const unresolved = result.tokens.filter((t) => t.unresolvedKanji)

  // Tokens we have not asked kuromoji about yet. Keyed on presence rather than
  // truthiness so a word that yields no reading is not retried forever.
  const pendingReadings = unresolved
    .map((t) => t.raw)
    .filter((raw) => !(raw in morph))
    .join("\u0000")

  useEffect(() => {
    if (!kuroReady || !pendingReadings) {
      setMorphBusy(false)
      return
    }
    let cancelled = false
    setMorphBusy(true)
    void (async () => {
      const next: Record<string, string> = {}
      for (const word of pendingReadings.split("\u0000")) {
        try {
          next[word] = await readingWithKuromoji(word)
        } catch {
          next[word] = ""
        }
      }
      if (cancelled) return
      setMorph((prev) => ({ ...prev, ...next }))
      setMorphBusy(false)
    })()
    return () => {
      cancelled = true
    }
  }, [kuroReady, pendingReadings])

  const kuroBadge = kuroError
    ? { variant: "warning" as const, label: "Kuromoji failed", spinning: false }
    : kuroLoading
      ? {
          variant: "outline" as const,
          label: `Kuromoji ${Math.round(kuroProgress * 100)}%`,
          spinning: true,
        }
      : morphBusy
        ? { variant: "success" as const, label: "Kuromoji reading…", spinning: true }
        : kuroReady
          ? { variant: "success" as const, label: "Kuromoji ready", spinning: false }
          : { variant: "outline" as const, label: "Kuromoji off", spinning: false }

  async function onCopy(key: string, value: string) {
    if (!value) return
    await copyText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1500)
  }

  async function onLoadKuromoji() {
    setKuroError(null)
    setKuroLoading(true)
    try {
      await loadKuromoji(setKuroProgress)
      setKuroReady(true)
    } catch (error) {
      setKuroError(
        error instanceof Error ? error.message : "Could not load kuromoji.",
      )
    } finally {
      setKuroLoading(false)
    }
  }

  function chooseExample(value: string) {
    setInput(value)
    setSelections([])
    setOverride(null)
  }

  function chooseAlt(tokenIndex: number, altIndex: number) {
    setSelections((prev) => {
      const next = [...prev]
      next[tokenIndex] = altIndex
      return next
    })
    setOverride(null)
  }

  const byteRatio = Math.min(1, zengin.bytes / zengin.maxBytes)
  const empty = !input.trim()

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Japan payments
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Beneficiary name → Zengin kana
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Type a payee in English or Japanese. This prototype folds it to the
              30-byte half-width katakana field used in 総合振込, and back to latin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={online ? "success" : "warning"}>
              {online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
              {online ? "Online" : "Offline"}
            </Badge>
            <Badge variant={pwaReady || dictReady ? "secondary" : "outline"}>
              {pwaReady ? "Offline ready" : "Needs first load"}
            </Badge>
            <Badge variant={dictReady ? "success" : "outline"}>
              <BookOpen className="mr-1 size-3" />
              {dictReady ? "JMnedict loaded" : "Core names only"}
            </Badge>
            <Badge variant={kuroBadge.variant}>
              {kuroBadge.spinning ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Languages className="mr-1 size-3" />
              )}
              {kuroBadge.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-16">
        <Alert>
          Confirm the payment name against the beneficiary bank’s registered
          名義カナ before sending. This is phonetic assistance, not the
          account-of-record name. Zengin does not accept kanji in 受取人名.
        </Alert>

        {dictError ? (
          <Alert variant="warning">{dictError} Common names still convert.</Alert>
        ) : null}

        <section className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {(["auto", "en-to-ja", "ja-to-en"] as Direction[]).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={direction === value ? "default" : "outline"}
                onClick={() => setDirection(value)}
              >
                {value === "auto"
                  ? "Auto"
                  : value === "en-to-ja"
                    ? "EN → JA"
                    : "JA → EN"}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Beneficiary name</Label>
            <Textarea
              id="name"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setSelections([])
                setOverride(null)
              }}
              placeholder="John Smith, 山田太郎, Kim Minjun…"
              className="min-h-28 text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Button
                key={ex}
                size="sm"
                variant="ghost"
                className="border border-dashed"
                onClick={() => chooseExample(ex)}
              >
                {ex}
              </Button>
            ))}
          </div>
        </section>

        {empty ? (
          <Card>
            <CardHeader>
              <CardTitle>No name yet</CardTitle>
              <CardDescription>
                Paste a beneficiary to see the Zengin field, byte count, and
                latin/romaji line. Dictionary hits are tagged; ambiguous names
                get reading chips.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Payment name (Zengin)</CardTitle>
                    <CardDescription>
                      受取人名 C(30) · half-width katakana · {zengin.bytes}/
                      {zengin.maxBytes} bytes
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopy("zengin", zengin.value)}
                    disabled={!zengin.value}
                  >
                    {copied === "zengin" ? <Check /> : <Copy />}
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div
                  className="min-h-14 rounded-md bg-muted px-3 py-3 font-mono text-lg tracking-wide break-all"
                  aria-live="polite"
                >
                  {zengin.value || "—"}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      byteRatio < 0.8
                        ? "bg-emerald-600"
                        : byteRatio <= 1 && !zengin.truncated
                          ? "bg-amber-500"
                          : "bg-destructive",
                    )}
                    style={{ width: `${Math.min(100, byteRatio * 100)}%` }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="override">Edit kana (re-folds only)</Label>
                  <Input
                    id="override"
                    value={override ?? result.katakana}
                    onChange={(e) => setOverride(e.target.value)}
                    className="font-mono"
                  />
                </div>
                {zengin.stripped.length ? (
                  <div className="flex flex-wrap gap-1">
                    {zengin.stripped.map((ch) => (
                      <Badge key={ch} variant="warning">
                        stripped {ch}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>English / romaji</CardTitle>
                    <CardDescription>
                      Title case for display · uppercase for latin records
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopy("en", result.english.display)}
                    disabled={!result.english.display}
                  >
                    {copied === "en" ? <Check /> : <Copy />}
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="min-h-14 rounded-md bg-muted px-3 py-3 text-lg">
                  {result.english.display || "—"}
                </div>
                <p className="font-mono text-sm text-muted-foreground">
                  {result.english.uppercase || "—"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.tokens.map((token, i) => (
                    <Badge key={`${token.raw}-${i}`} variant="outline">
                      {token.raw}
                      {token.chosen ? ` · ${token.chosen.source}` : ""}
                      {token.chosen?.origin ? ` · ${token.chosen.origin}` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {result.tokens.some((t) => t.alternatives.length > 1) ? (
          <Card>
            <CardHeader>
              <CardTitle>Alternate readings</CardTitle>
              <CardDescription>
                Same spelling can be a different payment name. Pick the one that
                matches the account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {result.tokens.map((token, tokenIndex) =>
                token.alternatives.length > 1 ? (
                  <div key={`${token.raw}-${tokenIndex}`} className="grid gap-2">
                    <p className="text-sm font-medium">{token.raw}</p>
                    <div className="flex flex-wrap gap-2">
                      {token.alternatives.map((alt, altIndex) => (
                        <Button
                          key={alt.label}
                          size="sm"
                          variant={
                            token.chosen?.kana === alt.kana &&
                            token.chosen.origin === alt.origin
                              ? "default"
                              : "outline"
                          }
                          onClick={() => chooseAlt(tokenIndex, altIndex)}
                        >
                          {alt.kana}
                          <span className="text-xs opacity-80">
                            {alt.romaji}
                            {alt.origin ? ` · ${alt.origin}` : ""}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </CardContent>
          </Card>
        ) : null}

        {result.issues.length ? (
          <div className="grid gap-2">
            {result.issues.map((issue) => (
              <Alert
                key={issue.code + issue.detail}
                variant={
                  issue.code === "kanji_unresolved" ? "warning" : "default"
                }
              >
                <span className="font-medium">{issue.code}</span>
                <span className="mt-1 block">{issue.detail}</span>
              </Alert>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Reading fallback (kuromoji)</CardTitle>
            <CardDescription>
              Optional ~17MB IPA dictionary from jsDelivr, cached after the first
              download so later offline use still works. Not a name dictionary —
              guesses stay marked uncertain.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {unresolved.length ? (
              <p className="text-sm">
                Unresolved kanji:{" "}
                <span className="font-medium">
                  {unresolved.map((t) => t.raw).join("、")}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Load this only when a kanji name is missing from JMnedict.
              </p>
            )}
            {kuroReady ? (
              <Badge variant="success">Reading fallback ready (offline)</Badge>
            ) : (
              <Button
                onClick={onLoadKuromoji}
                disabled={kuroLoading || (!online && !kuroReady)}
              >
                {kuroLoading ? <Loader2 className="animate-spin" /> : <BookOpen />}
                Load reading fallback (~17MB)
              </Button>
            )}
            {kuroLoading ? (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round(kuroProgress * 100)}%` }}
                />
              </div>
            ) : null}
            {!online && !kuroReady ? (
              <p className="flex items-start gap-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                This download needs a network once. After that, the service
                worker keeps the dictionary for offline use.
              </p>
            ) : null}
            {kuroError ? <Alert variant="destructive">{kuroError}</Alert> : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
