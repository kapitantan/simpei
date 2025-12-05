import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection, type PeerJSOption } from 'peerjs'
import type { PeerConnectionOptions, PeerMessage, PeerStateSnapshot } from './messages'

interface UsePeerConnectionArgs {
  options: PeerConnectionOptions
  onMessage?: (message: PeerMessage) => void
}

const buildPeerOptions = (options: PeerConnectionOptions): PeerJSOption => {
  const result: PeerJSOption = {
    host: options.host,
    path: options.path ?? '/',
    secure: options.secure,
  }
  if (options.port) {
    result.port = options.port
  }
  return result
}

export const usePeerConnection = ({ options, onMessage }: UsePeerConnectionArgs) => {
  const [snapshot, setSnapshot] = useState<PeerStateSnapshot>({ status: 'initializing' })
  const peerRef = useRef<Peer | null>(null)
  const connectionRef = useRef<DataConnection | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const teardownConnection = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.close()
      connectionRef.current = null
    }
    setSnapshot((prev) => ({ ...prev, remotePeerId: undefined, status: 'ready' }))
  }, [])

  const setupConnection = useCallback(
    (conn: DataConnection) => {
      if (connectionRef.current) {
        connectionRef.current.close()
      }
      connectionRef.current = conn
      setSnapshot((prev) => ({ ...prev, status: 'connecting' }))

      conn.on('open', () => {
        setSnapshot((prev) => ({ ...prev, status: 'connected', remotePeerId: conn.peer, error: undefined }))
      })
      conn.on('data', (payload) => {
        try {
          const message = payload as PeerMessage
          onMessageRef.current?.(message)
        } catch (error) {
          console.error('Invalid message', error)
        }
      })
      conn.on('error', (err) => {
        console.error(err)
        setSnapshot((prev) => ({ ...prev, status: 'error', error: err.message }))
      })
      conn.on('close', () => {
        if (connectionRef.current === conn) {
          connectionRef.current = null
        }
        setSnapshot((prev) => ({ ...prev, status: 'ready', remotePeerId: undefined }))
      })
    },
    [],
  )

  useEffect(() => {
    const peer = new Peer(buildPeerOptions(options))
    peerRef.current = peer
    peer.on('open', (id) => {
      setSnapshot({ peerId: id, status: 'ready' })
    })
    peer.on('connection', (conn) => {
      setupConnection(conn)
    })
    peer.on('error', (err) => {
      console.error(err)
      setSnapshot((prev) => ({ ...prev, status: 'error', error: err.message }))
    })
    return () => {
      teardownConnection()
      peer.destroy()
    }
  }, [options, setupConnection, teardownConnection])

  const connect = useCallback(
    (remotePeerId: string) => {
      if (!peerRef.current) return
      if (!remotePeerId) return
      const connection = peerRef.current.connect(remotePeerId, { reliable: true })
      setupConnection(connection)
    },
    [setupConnection],
  )

  const disconnect = useCallback(() => {
    teardownConnection()
  }, [teardownConnection])

  const sendMessage = useCallback((message: PeerMessage) => {
    if (!connectionRef.current || !connectionRef.current.open) {
      return false
    }
    connectionRef.current.send(message)
    return true
  }, [])

  return {
    snapshot,
    connect,
    disconnect,
    sendMessage,
  }
}
