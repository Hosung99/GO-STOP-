import { io, type Socket } from 'socket.io-client'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'

let socketInstance: Socket<ServerEvent, ClientEvent> | null = null

export function initializeSocket(serverUrl: string): Socket<ServerEvent, ClientEvent> {
  if (!socketInstance) {
    socketInstance = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })
  }
  return socketInstance
}

export function getSocket(): Socket<ServerEvent, ClientEvent> | null {
  return socketInstance
}

export function isConnected(): boolean {
  return socketInstance?.connected ?? false
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
