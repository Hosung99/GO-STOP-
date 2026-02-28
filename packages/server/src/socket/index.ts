import { Server as SocketIOServer } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'

export function setupSocketNamespace(io: SocketIOServer<ClientEvent, ServerEvent>): void {
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id)
    })
  })
}
