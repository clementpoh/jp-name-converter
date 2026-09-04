/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __SINGLEFILE__: boolean

interface Window {
  /** Base64-encoded gzip of enamdict-people.json, injected by the singlefile build. */
  __ENAMDICT_GZ_B64__?: string
}
