import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { GameEngine } from '../game/engine.js'
import type { ClientEventMap, ServerEventMap } from './room-handlers.js'

export function handleGameEvents(
  _socket: Socket<ClientEventMap, ServerEventMap>,
  _io: SocketIOServer<ClientEventMap, ServerEventMap>,
  _games: Map<string, GameEngine>,
  _playerId: string,
): void {
  // TODO: implement in Task B2
}
