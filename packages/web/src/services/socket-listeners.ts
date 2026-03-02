import type { Socket } from 'socket.io-client'
import type { ClientEvent, ServerEvent, RoomState, PlayerInfo, ClientGameState, ClientPlayerState } from '@go-stop/shared'
import type { AnyRouter } from '@tanstack/react-router'
import { useRoomStore } from '../stores/room-store'
import { useGameStore } from '../stores/game-store'
import { useUIStore } from '../stores/ui-store'

// ServerEvent is a discriminated union, not an EventsMap, so Socket<ServerEvent, ClientEvent>
// cannot be used with .on() directly in TypeScript. We widen to `any` once here and keep
// all handler callback parameters explicitly typed for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySocket = { on: (event: string, handler: (...args: any[]) => void) => void }

export function attachSocketListeners(
  socket: Socket<ServerEvent, ClientEvent>,
  router: AnyRouter,
): void {
  const s = socket as unknown as AnySocket

  // Room events
  s.on('room:created', (data: { payload: { roomCode: string; room: RoomState } }) => {
    useRoomStore.getState().setRoom(data.payload.room)
    // socket.id is the playerId assigned to the room creator by the server.
    // Non-null assertion is safe: receiving room:created guarantees the socket is connected.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useRoomStore.getState().setMyPlayerId(socket.id!)
    void router.navigate({ to: '/room/$roomCode', params: { roomCode: data.payload.roomCode } })
  })

  s.on('room:joined', (data: { payload: { room: RoomState; playerId: string } }) => {
    useRoomStore.getState().setRoom(data.payload.room)
    useRoomStore.getState().setMyPlayerId(data.payload.playerId)
    const roomCode = data.payload.room.code
    void router.navigate({ to: '/room/$roomCode', params: { roomCode } })
  })

  s.on('room:player_joined', (data: { payload: { player: PlayerInfo } }) => {
    useRoomStore.getState().playerJoined(data.payload.player)
  })

  s.on('room:player_left', (data: { payload: { playerId: string } }) => {
    useRoomStore.getState().playerLeft(data.payload.playerId)
  })

  s.on('room:player_ready', (data: { payload: { playerId: string; ready: boolean } }) => {
    useRoomStore.getState().updatePlayerReady(data.payload.playerId, data.payload.ready)
  })

  // Game lifecycle
  s.on(
    'game:dealt',
    (data: { payload: { hand: ClientGameState['myHand']; fieldCards: ClientGameState['fieldCards']; deckCount: number } }) => {
      const room = useRoomStore.getState().room
      useGameStore.getState().setGameState({
        phase: { phase: 'DEALING', roundNumber: 1 },
        roomCode: room?.code ?? '',
        players: [] as readonly ClientPlayerState[],
        myHand: data.payload.hand,
        fieldCards: data.payload.fieldCards,
        deckCount: data.payload.deckCount,
        currentPlayerIndex: 0,
        turnTimeRemaining: 0,
        nagariCount: 0,
        roundNumber: 1,
      })
    },
  )

  s.on('game:started', () => {
    void router.navigate({ to: '/game' })
  })

  s.on('game:turn_start', (data: { payload: { currentPlayerId: string; timeLimit: number } }) => {
    const current = useGameStore.getState().gameState
    if (!current) return
    useGameStore.getState().setGameState({
      ...current,
      phase: {
        phase: 'TURN_PLAY_CARD',
        currentPlayerId: data.payload.currentPlayerId,
        timeoutAt: Date.now() + data.payload.timeLimit,
      },
    })
  })

  s.on('game:score_check', (data: { payload: { canGoStop: boolean } }) => {
    if (data.payload.canGoStop) {
      useUIStore.getState().openModal('goStop')
    }
  })

  s.on('game:round_end', (data: { payload: { winner: string | null; finalScore: number } }) => {
    useUIStore.getState().addToast(
      `라운드 종료! 승자: ${data.payload.winner ?? '없음'} (${String(data.payload.finalScore)}점)`,
      'success',
    )
    useGameStore.getState().clearGameState()
    void router.navigate({ to: '/' })
  })

  // Error events
  s.on('error:room', (data: { payload: { message: string } }) => {
    useUIStore.getState().addToast(data.payload.message, 'error')
  })

  s.on('error:game', (data: { payload: { message: string } }) => {
    useUIStore.getState().addToast(data.payload.message, 'error')
  })
}
