import { getCardsByMonth } from '../cards/constants'
import type { HwaTuCard, Month } from '../cards/types'

export interface SpecialHandCheck {
  readonly chongTongMonth: Month | null
  readonly shakeableMonths: readonly Month[]
  readonly canRequestReshuffle: boolean
}

export function checkSpecialHands(handCards: readonly HwaTuCard[]): SpecialHandCheck {
  let chongTongMonth: Month | null = null
  const shakeableMonths: Month[] = []

  // Check chongTong (총통) and shakeable (흔들기)
  for (let month = 1; month <= 12; month++) {
    const monthCards = getCardsByMonth(handCards, month as Month)
    if (monthCards.length === 4) {
      chongTongMonth = month as Month
    } else if (monthCards.length === 3) {
      shakeableMonths.push(month as Month)
    }
  }

  // Check reshuffle eligibility (짜맞추기)
  const monthCounts: Partial<Record<Month, number>> = {}
  for (const card of handCards) {
    monthCounts[card.month] = (monthCounts[card.month] ?? 0) + 1
  }

  const canRequestReshuffle = Object.values(monthCounts).every((count) => count === 1)

  return {
    chongTongMonth,
    shakeableMonths,
    canRequestReshuffle,
  }
}
