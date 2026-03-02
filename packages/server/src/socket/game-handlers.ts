import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { HwaTuCard, ScoreBreakdown } from '@go-stop/shared'
import { GAME_CONSTANTS } from '@go-stop/shared'
import type { GameEngine } from '../game/engine.js'
import type { ClientEventMap, ServerEventMap } from './room-handlers.js'

type AppSocket = Socket<ClientEventMap, ServerEventMap>
type AppServer = SocketIOServer<ClientEventMap, ServerEventMap>

export function handleGameEvents(
  socket: AppSocket,
  io: AppServer,
  games: Map<string, GameEngine>,
  playerId: string,
): void {

  function getPlayerRoom(): string | undefined {
    return [...socket.rooms].find((r) => r !== socket.id)
  }

  function isCurrentPlayer(): boolean {
    const roomCode = getPlayerRoom()
    if (!roomCode) return false
    const engine = games.get(roomCode)
    if (!engine) return false
    const state = engine.getState()
    return state.players[state.currentPlayerIndex]?.id === playerId
  }

  // game:play_card
  socket.on('game:play_card', ({ payload }) => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    if (!isCurrentPlayer()) {
      socket.emit('error:game', { event: 'error:game', payload: { message: 'Not your turn', code: 'NOT_YOUR_TURN' } })
      return
    }

    try {
      // Read the card from hand BEFORE calling playCard (it will be removed from hand after)
      const stateBefore = engine.getState()
      const player = stateBefore.players.find((p) => p.id === playerId)
      const card = player?.hand.find((c) => c.id === payload.cardId)
      if (!card) {
        socket.emit('error:game', {
          event: 'error:game',
          payload: { message: 'Card not in hand', code: 'INVALID_ACTION' },
        })
        return
      }

      const { matchOptions } = engine.playCard(playerId, payload.cardId)

      io.to(roomCode).emit('game:card_played', {
        event: 'game:card_played',
        payload: {
          playerId,
          card,
          matchOptions: matchOptions as HwaTuCard[],
        },
      })

      if (matchOptions.length <= 1) {
        // Auto-resolved (0 or 1 match): flip the deck card
        const { flippedCard, matchOptions: flipMatches } = engine.flipDeck(playerId)
        io.to(roomCode).emit('game:deck_flipped', {
          event: 'game:deck_flipped',
          payload: {
            card: flippedCard,
            matchOptions: flipMatches as HwaTuCard[],
          },
        })
        if (flipMatches.length <= 1) {
          // Auto-resolved flip: check score and advance or prompt go/stop
          resolveCapture(engine, roomCode, playerId, io)
        }
        // flipMatches.length > 1: player must choose via game:choose_flip_match
      }
      // matchOptions.length > 1: player must choose via game:choose_field_card
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { event: 'error:game', payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })

  // game:choose_field_card — player selects which matching field card to capture
  socket.on('game:choose_field_card', ({ payload }) => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    try {
      engine.chooseFieldCard(playerId, payload.cardId)
      // Note: chosen card is now removed from field and placed in player's captured
      io.to(roomCode).emit('game:field_card_chosen', {
        event: 'game:field_card_chosen',
        payload: {
          playerId,
          card: { id: payload.cardId, month: 1, index: 0, type: 'junk' as const, name: '?' },
        },
      })
      // Now flip the deck
      const { flippedCard, matchOptions: flipMatches } = engine.flipDeck(playerId)
      io.to(roomCode).emit('game:deck_flipped', {
        event: 'game:deck_flipped',
        payload: { card: flippedCard, matchOptions: flipMatches as HwaTuCard[] },
      })
      if (flipMatches.length <= 1) {
        resolveCapture(engine, roomCode, playerId, io)
      }
      // flipMatches.length > 1: player must choose via game:choose_flip_match
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { event: 'error:game', payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })

  // game:choose_flip_match — player selects which field card the flipped deck card captures
  socket.on('game:choose_flip_match', ({ payload }) => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    try {
      engine.chooseFlipMatch(playerId, payload.cardId)
      io.to(roomCode).emit('game:flip_match_chosen', {
        event: 'game:flip_match_chosen',
        payload: {
          playerId,
          card: { id: payload.cardId, month: 1, index: 0, type: 'junk' as const, name: '?' },
        },
      })
      resolveCapture(engine, roomCode, playerId, io)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { event: 'error:game', payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })

  // game:declare_go
  socket.on('game:declare_go', () => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    if (!isCurrentPlayer()) {
      socket.emit('error:game', { event: 'error:game', payload: { message: 'Not your turn', code: 'NOT_YOUR_TURN' } })
      return
    }

    try {
      engine.declareGo(playerId)
      const state = engine.getState()
      const player = state.players.find((p) => p.id === playerId)
      io.to(roomCode).emit('game:go_declared', {
        event: 'game:go_declared',
        payload: { playerId, goCount: player?.goCount ?? 0 },
      })
      engine.advanceTurn()
      const newState = engine.getState()
      const currentPlayer = newState.players[newState.currentPlayerIndex]
      if (!currentPlayer) throw new Error('PLAYER_NOT_FOUND')
      io.to(roomCode).emit('game:turn_start', {
        event: 'game:turn_start',
        payload: {
          currentPlayerId: currentPlayer.id,
          timeLimit: GAME_CONSTANTS.TURN_TIMEOUT_MS,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { event: 'error:game', payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })

  // game:declare_stop
  socket.on('game:declare_stop', () => {
    const roomCode = getPlayerRoom()
    if (!roomCode) return
    const engine = games.get(roomCode)
    if (!engine) return

    if (!isCurrentPlayer()) {
      socket.emit('error:game', { event: 'error:game', payload: { message: 'Not your turn', code: 'NOT_YOUR_TURN' } })
      return
    }

    try {
      const { score, canGoStop } = engine.checkScore(playerId)
      if (!canGoStop) {
        socket.emit('error:game', { event: 'error:game', payload: { message: 'Score threshold not reached', code: 'CANNOT_STOP' } })
        return
      }
      io.to(roomCode).emit('game:round_end', {
        event: 'game:round_end',
        payload: {
          winner: playerId,
          scoreBreakdown: score,
          finalScore: score.finalPoints,
          multipliers: score.multipliers,
        },
      })
      games.delete(roomCode)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid action'
      socket.emit('error:game', { event: 'error:game', payload: { message: msg, code: 'INVALID_ACTION' } })
    }
  })
}

function resolveCapture(
  engine: GameEngine,
  roomCode: string,
  playerId: string,
  io: AppServer,
): void {
  try {
    const { score, canGoStop } = engine.checkScore(playerId)
    if (canGoStop) {
      io.to(roomCode).emit('game:score_check', {
        event: 'game:score_check',
        payload: {
          playerId,
          score: score.finalPoints,
          breakdown: score as ScoreBreakdown,
          canGoStop: true,
        },
      })
      // Player will then emit game:declare_go or game:declare_stop
    } else {
      engine.advanceTurn()
      const state = engine.getState()
      const currentPlayer = state.players[state.currentPlayerIndex]
      if (!currentPlayer) throw new Error('PLAYER_NOT_FOUND')
      io.to(roomCode).emit('game:turn_start', {
        event: 'game:turn_start',
        payload: {
          currentPlayerId: currentPlayer.id,
          timeLimit: GAME_CONSTANTS.TURN_TIMEOUT_MS,
        },
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resolve failed'
    io.to(roomCode).emit('error:game', {
      event: 'error:game',
      payload: { message: msg, code: 'RESOLVE_FAILED' },
    })
  }
}
