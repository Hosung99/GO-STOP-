import type { CapturedCards, GamePhase, HwaTuCard, ScoreBreakdown } from '@go-stop/shared'
import {
  calculateScore,
  canDeclareGoStop,
  createFullDeck,
  dealCards,
  findFieldMatches,
  GAME_CONSTANTS,
  getDealConfig,
  getMatchCount,
  isBomb,
  shuffleDeck,
} from '@go-stop/shared'

/**
 * Describes a pending choice the current player must make.
 * When multiple field cards match a played card, the player must select one.
 */
export interface PendingCardChoice {
  readonly type: 'CARD_CHOICE'
  readonly playedCard: HwaTuCard
  readonly matchingFieldCards: readonly HwaTuCard[]
}

/**
 * Discriminated union for turn context.
 * null means no active pending decision.
 */
export type TurnContext = PendingCardChoice | null

export interface ServerGameState {
  readonly roomCode: string
  readonly phase: GamePhase
  readonly deck: readonly HwaTuCard[]
  readonly players: readonly ServerPlayerState[]
  readonly fieldCards: readonly HwaTuCard[]
  readonly currentPlayerIndex: number
  readonly turnContext: TurnContext
  readonly nagariCount: number
  readonly roundNumber: number
  readonly shakeMultipliers: ReadonlyMap<string, number>
  readonly bombMultipliers: ReadonlyMap<string, number>
  readonly history: readonly TurnRecord[]
}

export interface ServerPlayerState {
  readonly id: string
  readonly socketId?: string
  readonly name?: string
  readonly hand: readonly HwaTuCard[]
  readonly captured: CapturedCards
  readonly score: number
  readonly goCount: number
  readonly isConnected: boolean
  readonly reconnectToken?: string
}

interface TurnRecord {
  readonly roundNumber: number
  readonly playerId: string
  readonly action: string
  readonly timestamp: number
}

function getCaptureKey(card: HwaTuCard): keyof CapturedCards {
  switch (card.type) {
    case 'gwang':
      return 'gwang'
    case 'animal':
      return 'animal'
    case 'ribbon':
      return 'ribbon'
    case 'junk':
    case 'double_junk':
      return 'pi'
  }
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
        hand: playerHands[idx] ?? [],
        captured: { gwang: [], animal: [], ribbon: [], pi: [] },
        score: 0,
        goCount: 0,
        isConnected: true,
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

  playCard(
    playerId: string,
    cardId: string,
  ): {
    matchOptions: readonly HwaTuCard[]
    isBomb: boolean
  } {
    const player = this.state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    const card = player.hand.find((c) => c.id === cardId)
    if (!card) throw new Error('CARD_NOT_IN_HAND')

    const matches = findFieldMatches(card, this.state.fieldCards)
    const matchCount = getMatchCount(card, this.state.fieldCards)
    const bomb = isBomb(matchCount)

    const newHand = player.hand.filter((c) => c.id !== cardId)

    let newFieldCards = this.state.fieldCards
    let newCaptured: CapturedCards = { ...player.captured }
    let newPhase: GamePhase
    let newTurnContext: TurnContext

    if (matches.length === 0) {
      // No match: place card on field
      newFieldCards = [...this.state.fieldCards, card]
      newPhase = {
        phase: 'TURN_FLIP_DECK',
        currentPlayerId: playerId,
        timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      }
      newTurnContext = null
    } else if (matches.length === 1) {
      // 1 match: auto-capture both cards to their respective buckets
      const match = matches[0]!
      newFieldCards = this.state.fieldCards.filter((c) => c.id !== match.id)
      const playedKey = getCaptureKey(card)
      const matchKey = getCaptureKey(match)
      // Place each card in its own type-appropriate bucket
      const afterPlayedCard = {
        ...player.captured,
        [playedKey]: [...player.captured[playedKey], card],
      }
      newCaptured = {
        ...afterPlayedCard,
        [matchKey]: [...afterPlayedCard[matchKey], match],
      }
      newPhase = { phase: 'TURN_FLIP_DECK', currentPlayerId: playerId, timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS }
      newTurnContext = null
    } else if (bomb) {
      // Bomb: all 3 field cards auto-captured
      newFieldCards = this.state.fieldCards.filter(
        (c) => !matches.some((m) => m.id === c.id),
      )
      // Capture played card first
      let captured: CapturedCards = {
        ...player.captured,
        [getCaptureKey(card)]: [...player.captured[getCaptureKey(card)], card],
      }
      // Then capture all 3 field matches
      for (const match of matches) {
        captured = {
          ...captured,
          [getCaptureKey(match)]: [...captured[getCaptureKey(match)], match],
        }
      }
      newCaptured = captured
      newPhase = {
        phase: 'TURN_FLIP_DECK',
        currentPlayerId: playerId,
        timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      }
      newTurnContext = null
    } else {
      // 2 matches: player must choose which field card to capture
      newPhase = {
        phase: 'TURN_CHOOSE_FIELD_CARD',
        currentPlayerId: playerId,
        matchOptions: matches.map((c) => c.id),
        timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      }
      newTurnContext = {
        type: 'CARD_CHOICE',
        playedCard: card,
        matchingFieldCards: matches,
      }
    }

    const updatedPlayer: ServerPlayerState = {
      ...player,
      hand: newHand,
      captured: newCaptured,
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
      fieldCards: newFieldCards,
      phase: newPhase,
      turnContext: newTurnContext ?? null,
    }

    return { matchOptions: matches, isBomb: bomb }
  }

  flipDeck(playerId: string): {
    flippedCard: HwaTuCard
    matchOptions: readonly HwaTuCard[]
  } {
    const [flippedCard, ...remainingDeck] = this.state.deck
    if (!flippedCard) throw new Error('DECK_EMPTY')

    const matches = findFieldMatches(flippedCard, this.state.fieldCards)

    let newFieldCards = this.state.fieldCards
    let newPlayers = this.state.players
    let newPhase: GamePhase

    if (matches.length === 0) {
      // No match: place flipped card on field, go to resolve (auto-advance turn)
      newFieldCards = [...this.state.fieldCards, flippedCard]
      newPhase = { phase: 'TURN_RESOLVE_CAPTURE', currentPlayerId: playerId }
    } else if (matches.length === 1) {
      // 1 match: auto-capture both cards to their respective buckets
      const match = matches[0]!
      newFieldCards = this.state.fieldCards.filter((c) => c.id !== match.id)
      const player = this.state.players.find((p) => p.id === playerId)!
      const flippedKey = getCaptureKey(flippedCard)
      const matchKey = getCaptureKey(match)
      const afterFlipped = {
        ...player.captured,
        [flippedKey]: [...player.captured[flippedKey], flippedCard],
      }
      const newCaptured: CapturedCards = {
        ...afterFlipped,
        [matchKey]: [...afterFlipped[matchKey], match],
      }
      newPlayers = this.state.players.map((p) =>
        p.id === playerId ? { ...p, captured: newCaptured } : p,
      )
      newPhase = { phase: 'TURN_RESOLVE_CAPTURE', currentPlayerId: playerId }
    } else {
      // 2+ matches: player must choose
      newPhase = {
        phase: 'TURN_CHOOSE_FLIP_MATCH',
        currentPlayerId: playerId,
        matchOptions: matches.map((c) => c.id),
        timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      }
    }

    this.state = {
      ...this.state,
      deck: remainingDeck,
      players: newPlayers,
      fieldCards: newFieldCards,
      phase: newPhase,
      turnContext: matches.length > 1
        ? { type: 'CARD_CHOICE', playedCard: flippedCard, matchingFieldCards: matches }
        : null,
    }

    return { flippedCard, matchOptions: matches }
  }

  advanceTurn(): void {
    const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length
    const nextPlayer = this.state.players[nextIndex]
    if (!nextPlayer) throw new Error('PLAYER_NOT_FOUND')

    this.state = {
      ...this.state,
      currentPlayerIndex: nextIndex,
      phase: {
        phase: 'TURN_PLAY_CARD',
        currentPlayerId: nextPlayer.id,
        timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      },
      turnContext: null,
    }
  }

  checkScore(playerId: string): { score: ScoreBreakdown; canGoStop: boolean } {
    const player = this.state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    const score = calculateScore(player.captured)
    const playerCount = this.state.players.length as 2 | 3
    const canGoStop = canDeclareGoStop(score.finalPoints, playerCount)

    return { score, canGoStop }
  }

  declareGo(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    const updatedPlayer: ServerPlayerState = {
      ...player,
      goCount: player.goCount + 1,
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((p) => (p.id === playerId ? updatedPlayer : p)),
    }
  }

  /**
   * Player chose which field card to capture in a multi-match scenario.
   * Precondition: phase is TURN_CHOOSE_FIELD_CARD and turnContext is CARD_CHOICE
   */
  chooseFieldCard(playerId: string, chosenFieldCardId: string): void {
    if (this.state.phase.phase !== 'TURN_CHOOSE_FIELD_CARD') {
      throw new Error('INVALID_PHASE')
    }
    const ctx = this.state.turnContext
    if (!ctx || ctx.type !== 'CARD_CHOICE') {
      throw new Error('NO_TURN_CONTEXT')
    }
    const chosenCard = this.state.fieldCards.find((c) => c.id === chosenFieldCardId)
    if (!chosenCard) throw new Error('CARD_NOT_ON_FIELD')

    const isValidChoice = ctx.matchingFieldCards.some((c) => c.id === chosenFieldCardId)
    if (!isValidChoice) throw new Error('INVALID_CHOICE')

    const player = this.state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    const playedCard = ctx.playedCard
    const newFieldCards = this.state.fieldCards.filter((c) => c.id !== chosenFieldCardId)
    const playedKey = getCaptureKey(playedCard)
    const matchKey = getCaptureKey(chosenCard)
    const afterPlayedCard = {
      ...player.captured,
      [playedKey]: [...player.captured[playedKey], playedCard],
    }
    const newCaptured: CapturedCards = {
      ...afterPlayedCard,
      [matchKey]: [...afterPlayedCard[matchKey], chosenCard],
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, captured: newCaptured } : p,
      ),
      fieldCards: newFieldCards,
      phase: { phase: 'TURN_FLIP_DECK', currentPlayerId: playerId, timeoutAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS },
      turnContext: null,
    }
  }

  /**
   * Player chose which field card matches the deck flip in a multi-match scenario.
   * Precondition: phase is TURN_CHOOSE_FLIP_MATCH and turnContext is CARD_CHOICE
   */
  chooseFlipMatch(playerId: string, chosenFieldCardId: string): void {
    if (this.state.phase.phase !== 'TURN_CHOOSE_FLIP_MATCH') {
      throw new Error('INVALID_PHASE')
    }
    const ctx = this.state.turnContext
    if (!ctx || ctx.type !== 'CARD_CHOICE') {
      throw new Error('NO_TURN_CONTEXT')
    }
    const chosenCard = this.state.fieldCards.find((c) => c.id === chosenFieldCardId)
    if (!chosenCard) throw new Error('CARD_NOT_ON_FIELD')

    const isValidChoice = ctx.matchingFieldCards.some((c) => c.id === chosenFieldCardId)
    if (!isValidChoice) throw new Error('INVALID_CHOICE')

    const player = this.state.players.find((p) => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    const flippedCard = ctx.playedCard
    const newFieldCards = this.state.fieldCards.filter((c) => c.id !== chosenFieldCardId)
    const flippedKey = getCaptureKey(flippedCard)
    const matchKey = getCaptureKey(chosenCard)
    const afterFlipped = {
      ...player.captured,
      [flippedKey]: [...player.captured[flippedKey], flippedCard],
    }
    const newCaptured: CapturedCards = {
      ...afterFlipped,
      [matchKey]: [...afterFlipped[matchKey], chosenCard],
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, captured: newCaptured } : p,
      ),
      fieldCards: newFieldCards,
      phase: { phase: 'TURN_RESOLVE_CAPTURE', currentPlayerId: playerId },
      turnContext: null,
    }
  }
}
