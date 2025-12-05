import type { PeerConnectionOptions } from './messages'

const parsePort = (value?: string): number | undefined => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const parseBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const defaultHost = import.meta.env.VITE_PEER_HOST ?? window.location.hostname ?? 'localhost'
const defaultPort = parsePort(import.meta.env.VITE_PEER_PORT)
const defaultPath = import.meta.env.VITE_PEER_PATH ?? '/'
const defaultSecure =
  parseBoolean(import.meta.env.VITE_PEER_SECURE) ?? (defaultHost !== 'localhost' && defaultHost !== '127.0.0.1')

export const peerConnectionOptions: PeerConnectionOptions = {
  host: defaultHost,
  port: defaultPort,
  path: defaultPath,
  secure: defaultSecure,
}
