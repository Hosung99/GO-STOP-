import type { GamePhase, HwaTuCard } from '@go-stop/shared'
import { createFullDeck, shuffleDeck, dealCards, getDealConfig } from '@go-stop/shared'

export interface ServerGameState {
  readonly roomCode: string
  readonly phase: GamePhase
  readonly deck: readonly HwaTuCard[]
  readonly players: readonly ServerPlayerState[]
  readonly fieldCards: readonly HwaTuCard[]
  readonly currentPlayerIndex: number
  readonly turnContext: unknown | null
  readonly nagariCount: number
  readonly roundNumber: number
  readonly shakeMultipliers: ReadonlyMap<string, number>
  readonly bombMultipliers: ReadonlyMap<string, number>
  readonly history: readonly TurnRecord[]
}

export interface ServerPlayerState {
  readonly id: string
  readonly socketId: string
  readonly name: string
  readonly hand: readonly HwaTuCard[]
  readonly captured: CapturedCards
  readonly score: number
  readonly goCount: number
  readonly isConnected: boolean
  readonly reconnectToken: string
}

interface CapturedCards {
  readonly gwang: readonly HwaTuCard[]
  readonly animal: readonly HwaTuCard[]
  readonly ribbon: readonly HwaTuCard[]
  readonly pi: readonly HwaTuCard[]
}

interface TurnRecord {
  readonly roundNumber: number
  readonly playerId: string
  readonly action: string
  readonly timestamp: number
}

export class GameEngine {
  private state: ServerGameState

  constructor(roomCode: string, playerIds: readonly string[], playerCount: 2 | 3) {
    const deck = shuffleDeck(createFullDeck())
    const dealConfig = getDealConfig(playerCount)
    const { playerHands, fieldCards, deck: remainingDeck } = dealCards(deck, dealConfig)

    this.state = {
      roomCode,
      phase: { phase: 'DEALING', roundNumber: 1 },
      deck: remainingDeck,
      players: playerIds.map((id, idx) => ({
        id,
        socketId: '',
        name: '',
        hand: playerHands[idx] ?? [],
        captured: { gwang: [], animal: [], ribbon: [], pi: [] },
        score: 0,
        goCount: 0,
        isConnected: true,
        reconnectToken: '',
      })),
      fieldCards,
      currentPlayerIndex: 0,
      turnContext: null,
      nagariCount: 0,
      roundNumber: 1,
      shakeMultipliers: new Map(),
      bombMultipliers: new Map(),
      history: [],
    }
  }

  getState(): Readonly<ServerGameState> {
    return this.state
  }
}
