import { getCardsByMonth } from '../cards/constants'
import type { HwaTuCard, Month } from '../cards/types'

export function canDeclareGoStop(
  score: number,
  playerCount: 2 | 3,
): boolean {
  // 2인(맞고): 7점 이상
  // 3인(고스톱): 3점 이상
  const threshold = playerCount === 2 ? 7 : 3
  return score >= threshold
}

export function canDeclareShake(handCards: readonly HwaTuCard[], month: Month): boolean {
  // 한 달 카드 3장이 손패에 있으면 흔들기 가능
  const cardsOfMonth = getCardsByMonth(handCards, month)
  return cardsOfMonth.length === 3
}

export interface ChongTongResult {
  readonly isChongTong: boolean
  readonly month: Month | null
}

export function checkChongTong(handCards: readonly HwaTuCard[]): ChongTongResult {
  // 한 달 카드 4장이 모두 손패에 있으면 총통
  for (let month = 1; month <= 12; month++) {
    const cardsOfMonth = getCardsByMonth(handCards, month as Month)
    if (cardsOfMonth.length === 4) {
      return { isChongTong: true, month: month as Month }
    }
  }
  return { isChongTong: false, month: null }
}

export function canRequestReshuffle(handCards: readonly HwaTuCard[]): boolean {
  // 3인 고스톱: 피 7장 이상 또는 같은 달 2장 이상 없음 (짜맞추기 자격)
  // 2인 맞고: 같은 달 없음
  // Simplified: just check if has no same-month pairs
  const monthCounts: Partial<Record<Month, number>> = {}

  for (const card of handCards) {
    monthCounts[card.month] = (monthCounts[card.month] ?? 0) + 1
  }

  // 같은 달 2장 이상 없으면 짜맞추기 가능
  return Object.values(monthCounts).every((count) => count === 1)
}
