import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent } from '@go-stop/shared'
import type { RoomManager } from '../room/room-manager.js'

/**
 * Converts a discriminated union type (e.g. { event: 'room:create'; payload: P } | ...)
 * into a Socket.io EventsMap (e.g. { 'room:create': (arg: { event: 'room:create'; payload: P }) => void })
 */
type DiscriminatedUnionToEventMap<T extends { event: string; payload: unknown }> = {
  [E in T as E['event']]: (arg: E) => void
}

type ClientEventMap = DiscriminatedUnionToEventMap<ClientEvent>
type ServerEventMap = DiscriminatedUnionToEventMap<ServerEvent>

type AppSocket = Socket<ClientEventMap, ServerEventMap>
type AppServer = SocketIOServer<ClientEventMap, ServerEventMap>

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export function handleRoomEvents(
  socket: AppSocket,
  io: AppServer,
  roomManager: RoomManager,
  playerId: string,
): void {

  // room:create
  socket.on('room:create', ({ payload }) => {
    try {
      const code = generateRoomCode()
      const room = roomManager.createRoom(code, payload.maxPlayers, payload.isPrivate, playerId)
      room.addPlayer({
        id: playerId,
        name: payload.playerName,
        isReady: false,
        isConnected: true,
        isHost: true,
        socketId: socket.id,
      })
      socket.join(code)
      socket.emit('room:created', { event: 'room:created', payload: { roomCode: code, room: room.toState() } })
    } catch {
      socket.emit('error:room', { event: 'error:room', payload: { message: 'Failed to create room', code: 'CREATE_FAILED' } })
    }
  })

  // room:join
  socket.on('room:join', ({ payload }) => {
    try {
      const room = roomManager.getRoom(payload.roomCode)
      if (!room) {
        socket.emit('error:room', { event: 'error:room', payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' } })
        return
      }
      room.addPlayer({
        id: playerId,
        name: payload.playerName,
        isReady: false,
        isConnected: true,
        isHost: false,
        socketId: socket.id,
      })
      socket.join(payload.roomCode)
      socket.emit('room:joined', { event: 'room:joined', payload: { room: room.toState(), playerId } })
      socket.to(payload.roomCode).emit('room:player_joined', {
        event: 'room:player_joined',
        payload: { player: room.getPlayer(playerId) },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Join failed'
      socket.emit('error:room', { event: 'error:room', payload: { message, code: 'JOIN_FAILED' } })
    }
  })

  // room:leave
  socket.on('room:leave', ({ payload }) => {
    const room = roomManager.getRoom(payload.roomCode)
    if (!room) return
    room.removePlayer(playerId)
    socket.leave(payload.roomCode)
    io.to(payload.roomCode).emit('room:player_left', { event: 'room:player_left', payload: { playerId } })
    if (room.isEmpty()) roomManager.deleteRoom(payload.roomCode)
  })

  // room:ready
  socket.on('room:ready', ({ payload }) => {
    const room = roomManager.getRoom(payload.roomCode)
    if (!room) return
    room.setReady(playerId, payload.ready)
    io.to(payload.roomCode).emit('room:player_ready', {
      event: 'room:player_ready',
      payload: { playerId, ready: payload.ready },
    })
  })
}
