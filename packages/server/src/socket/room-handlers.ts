import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import type { RoomManager } from '../room/room-manager.js'

export function handleRoomEvents(
  _socket: Socket<ClientEvent, ServerEvent>,
  _io: SocketIOServer<ClientEvent, ServerEvent>,
  _roomManager: RoomManager,
  _playerId: string,
): void {
  // TODO: implement in Task A2
}
