import { Server as SocketIOServer } from 'socket.io'
import { RoomManager } from '../room/room-manager.js'
import { handleRoomEvents } from './room-handlers.js'
import type { ClientEventMap, ServerEventMap } from './room-handlers.js'

const roomManager = new RoomManager()

export function setupSocketNamespace(
  io: SocketIOServer<ClientEventMap, ServerEventMap>,
): void {
  io.on('connection', (socket) => {
    const playerId = socket.id

    handleRoomEvents(socket, io, roomManager, playerId)

    socket.on('disconnect', () => {
      // future: mark player disconnected in room
    })
  })
}
