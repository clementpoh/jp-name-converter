declare module "kuroshiro" {
  const Kuroshiro: new () => unknown
  export default Kuroshiro
}

declare module "kuroshiro-analyzer-kuromoji" {
  const KuromojiAnalyzer: new (opts?: { dictPath?: string }) => unknown
  export default KuromojiAnalyzer
}
