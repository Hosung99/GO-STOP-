import { CARD_DEFINITIONS } from './constants'
import type { HwaTuCard } from './types'

export function createFullDeck(): readonly HwaTuCard[] {
  return CARD_DEFINITIONS
}

export function shuffleDeck(deck: readonly HwaTuCard[]): readonly HwaTuCard[] {
  const result: HwaTuCard[] = [...deck]

  // Fisher-Yates shuffle (immutable)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }

  return result
}

export interface DealResult {
  readonly playerHands: readonly (readonly HwaTuCard[])[]
  readonly fieldCards: readonly HwaTuCard[]
  readonly deck: readonly HwaTuCard[]
}

export interface DealConfig {
  readonly playerCount: 2 | 3
  readonly handSize: number
  readonly fieldSize: number
}

export function getDealConfig(playerCount: 2 | 3): DealConfig {
  if (playerCount === 2) {
    return { playerCount: 2, handSize: 10, fieldSize: 8 }
  }
  return { playerCount: 3, handSize: 7, fieldSize: 6 }
}

export function dealCards(deck: readonly HwaTuCard[], config: DealConfig): DealResult {
  const hands: HwaTuCard[][] = []
  let deckIndex = 0

  // Create empty hands for each player
  for (let p = 0; p < config.playerCount; p++) {
    hands.push([])
  }

  // Deal to hands (round-robin)
  for (let i = 0; i < config.handSize; i++) {
    for (let p = 0; p < config.playerCount; p++) {
      const card = deck[deckIndex]!
      hands[p]!.push(card)
      deckIndex++
    }
  }

  // Deal to field
  const fieldCards: HwaTuCard[] = []
  for (let i = 0; i < config.fieldSize; i++) {
    const card = deck[deckIndex]!
    fieldCards.push(card)
    deckIndex++
  }

  // Remaining deck
  const remainingDeck = deck.slice(deckIndex)

  return {
    playerHands: hands.map((h) => Object.freeze([...h])),
    fieldCards: Object.freeze([...fieldCards]),
    deck: remainingDeck,
  }
}
