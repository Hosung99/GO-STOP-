import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { ClientEvent, ServerEvent, HwaTuCard } from '@go-stop/shared'
import type { RoomManager } from '../room/room-manager.js'
import { GameEngine } from '../game/engine.js'

/**
 * Converts a discriminated union type (e.g. { event: 'room:create'; payload: P } | ...)
 * into a Socket.io EventsMap (e.g. { 'room:create': (arg: { event: 'room:create'; payload: P }) => void })
 */
type DiscriminatedUnionToEventMap<T extends { event: string; payload: unknown }> = {
  [E in T as E['event']]: (arg: E) => void
}

export type ClientEventMap = DiscriminatedUnionToEventMap<ClientEvent>
export type ServerEventMap = DiscriminatedUnionToEventMap<ServerEvent>

type AppSocket = Socket<ClientEventMap, ServerEventMap>
type AppServer = SocketIOServer<ClientEventMap, ServerEventMap>

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export function handleRoomEvents(
  socket: AppSocket,
  io: AppServer,
  roomManager: RoomManager,
  games: Map<string, GameEngine>,
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
      const joinedPlayer = room.getPlayer(playerId)
      if (joinedPlayer) {
        socket.to(payload.roomCode).emit('room:player_joined', {
          event: 'room:player_joined',
          payload: { player: joinedPlayer },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Join failed'
      socket.emit('error:room', { event: 'error:room', payload: { message, code: 'JOIN_FAILED' } })
    }
  })

  // room:leave
  socket.on('room:leave', ({ payload }) => {
    try {
      const room = roomManager.getRoom(payload.roomCode)
      if (!room) return
      room.removePlayer(playerId)
      socket.leave(payload.roomCode)
      io.to(payload.roomCode).emit('room:player_left', { event: 'room:player_left', payload: { playerId } })
      if (room.isEmpty()) roomManager.deleteRoom(payload.roomCode)
    } catch {
      socket.emit('error:room', { event: 'error:room', payload: { message: 'Failed to leave room', code: 'LEAVE_FAILED' } })
    }
  })

  // room:ready
  socket.on('room:ready', ({ payload }) => {
    try {
      const room = roomManager.getRoom(payload.roomCode)
      if (!room) return
      room.setReady(playerId, payload.ready)
      io.to(payload.roomCode).emit('room:player_ready', {
        event: 'room:player_ready',
        payload: { playerId, ready: payload.ready },
      })
    } catch {
      socket.emit('error:room', { event: 'error:room', payload: { message: 'Failed to update ready state', code: 'READY_FAILED' } })
    }
  })

  // room:start
  socket.on('room:start', ({ payload }) => {
    try {
      const room = roomManager.getRoom(payload.roomCode)
      if (!room) {
        socket.emit('error:room', { event: 'error:room', payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' } })
        return
      }
      if (room.hostId !== playerId) {
        socket.emit('error:room', { event: 'error:room', payload: { message: 'Only host can start', code: 'NOT_HOST' } })
        return
      }
      if (!room.canStart()) {
        socket.emit('error:room', { event: 'error:room', payload: { message: 'Not all players ready', code: 'NOT_READY' } })
        return
      }

      const players = room.getPlayers()
      const playerCount = players.length
      if (playerCount !== 2 && playerCount !== 3) {
        socket.emit('error:room', { event: 'error:room', payload: { message: 'Invalid player count', code: 'START_FAILED' } })
        return
      }
      const playerIds = players.map((p) => p.id)

      // Safe cast: playerCount has been validated to be 2 or 3 at runtime above
      const narrowedCount: 2 | 3 = playerCount as 2 | 3
      const engine = new GameEngine(payload.roomCode, playerIds, narrowedCount)
      games.set(payload.roomCode, engine)

      const state = engine.getState()

      for (const player of players) {
        const playerSocket = io.sockets.sockets.get(player.socketId)
        if (!playerSocket) continue
        const myPlayer = state.players.find((p) => p.id === player.id)
        if (!myPlayer) continue
        playerSocket.emit('game:dealt', {
          event: 'game:dealt',
          payload: {
            hand: myPlayer.hand as HwaTuCard[],
            fieldCards: state.fieldCards as HwaTuCard[],
            deckCount: state.deck.length,
          },
        })
      }

      // game:started is intentionally broadcast AFTER the per-player game:dealt loop above.
      // Each player already received their individual hand, fieldCards, and deckCount via game:dealt.
      // game:started serves as a synchronisation signal only; gameState: null is valid per ServerEvent type.
      io.to(payload.roomCode).emit('game:started', { event: 'game:started', payload: { gameState: null } })
      io.to(payload.roomCode).emit('game:turn_start', {
        event: 'game:turn_start',
        payload: {
          currentPlayerId: state.players[0]?.id ?? '',
          timeLimit: 30000,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Start failed'
      socket.emit('error:room', { event: 'error:room', payload: { message, code: 'START_FAILED' } })
    }
  })
}
