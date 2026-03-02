import { Server as SocketIOServer } from 'socket.io'
import { RoomManager } from '../room/room-manager.js'
import { GameEngine } from '../game/engine.js'
import { handleRoomEvents } from './room-handlers.js'
import { handleGameEvents } from './game-handlers.js'
import type { ClientEventMap, ServerEventMap } from './room-handlers.js'

const roomManager = new RoomManager()
const games = new Map<string, GameEngine>()

export function setupSocketNamespace(
  io: SocketIOServer<ClientEventMap, ServerEventMap>,
): void {
  io.on('connection', (socket) => {
    const playerId = socket.id

    handleRoomEvents(socket, io, roomManager, games, playerId)
    handleGameEvents(socket, io, games, playerId)

    socket.on('disconnect', () => {
      // future: mark player disconnected in room
    })
  })
}
