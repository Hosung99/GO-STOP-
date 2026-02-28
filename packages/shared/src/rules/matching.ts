import type { HwaTuCard } from '../cards/types'

export function findFieldMatches(card: HwaTuCard, fieldCards: readonly HwaTuCard[]): readonly HwaTuCard[] {
  return fieldCards.filter((fieldCard) => fieldCard.month === card.month)
}

export function getMatchCount(card: HwaTuCard, fieldCards: readonly HwaTuCard[]): 0 | 1 | 2 | 3 {
  const matches = findFieldMatches(card, fieldCards)
  return Math.min(matches.length, 3) as 0 | 1 | 2 | 3
}

export function isBomb(matchCount: 0 | 1 | 2 | 3): boolean {
  return matchCount === 3
}
