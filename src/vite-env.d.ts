/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_PEER_HOST?: string
    readonly VITE_PEER_PORT?: string
    readonly VITE_PEER_PATH?: string
    readonly VITE_PEER_SECURE?: string
  }
}

export {}
