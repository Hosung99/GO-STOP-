import type { HwaTuCard } from '../cards/types'
import type { GamePhase } from '../fsm/types'
import type { CapturedCards } from '../scoring/types'

export interface ClientPlayerState {
  readonly id: string
  readonly name: string
  readonly handCount: number
  readonly captured: CapturedCards
  readonly score: number
  readonly goCount: number
  readonly isConnected: boolean
  readonly isReady: boolean
}

export interface ClientGameState {
  readonly phase: GamePhase
  readonly roomCode: string
  readonly players: readonly ClientPlayerState[]
  readonly myHand: readonly HwaTuCard[]
  readonly fieldCards: readonly HwaTuCard[]
  readonly deckCount: number
  readonly currentPlayerIndex: number
  readonly turnTimeRemaining: number
  readonly nagariCount: number
  readonly roundNumber: number
}

export interface RoomState {
  readonly code: string
  readonly hostId: string
  readonly maxPlayers: 2 | 3
  readonly isPrivate: boolean
  readonly status: 'waiting' | 'playing' | 'finished'
  readonly players: readonly PlayerInfo[]
}

export interface PlayerInfo {
  readonly id: string
  readonly name: string
  readonly isReady: boolean
  readonly isConnected: boolean
  readonly isHost: boolean
}
