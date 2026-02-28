import { getAnimalCards, getGwangCards, getPiCards, getRibbonCards } from '../cards/constants'
import type { CapturedCards, ScoreBreakdown } from './types'

function calculateGwangScore(gwangCards: readonly unknown[]): { points: number; type: 'none' | 'samgwang' | 'bigwang' | 'ogwang' } {
  const count = gwangCards.length

  if (count < 3) return { points: 0, type: 'none' }

  // Check if has rain gwang (month 12)
  const hasRainGwang = (gwangCards as any).some((card: any) => card.month === 12)

  if (count >= 5) {
    return { points: 15, type: 'ogwang' }
  }

  if (count === 4) {
    // 4광: non-rain=4점, with rain=4점 (비광 포함해도 같음)
    return { points: 4, type: 'bigwang' }
  }

  // count === 3
  if (hasRainGwang) {
    return { points: 2, type: 'samgwang' }
  }
  return { points: 3, type: 'samgwang' }
}

function calculateAnimalScore(animalCards: readonly unknown[]): { points: number; hasGodori: boolean } {
  const count = animalCards.length

  if (count < 5) return { points: 0, hasGodori: false }

  // Check godori: months 2, 4, 8 animals
  const months = (animalCards as any).map((card: any) => card.month)
  const hasGodori = months.includes(2) && months.includes(4) && months.includes(8)

  if (hasGodori) {
    return { points: 5, hasGodori: true }
  }

  // Points: 5장=1점, +1/장
  const points = 1 + (count - 5)
  return { points, hasGodori: false }
}

function calculateRibbonScore(ribbonCards: readonly unknown[]): {
  points: number
  hasHongdan: boolean
  hasChodan: boolean
  hasCheongdan: boolean
} {
  const count = ribbonCards.length

  if (count < 5) {
    // Check if has special ribbons but < 5 total
    const kinds = (ribbonCards as any).map((card: any) => card.ribbonKind)
    return {
      points: 0,
      hasHongdan: kinds.includes('hongdan'),
      hasChodan: kinds.includes('chodan'),
      hasCheongdan: kinds.includes('cheongdan'),
    }
  }

  const kinds = (ribbonCards as any).map((card: any) => card.ribbonKind)
  const hasHongdan = kinds.includes('hongdan')
  const hasChodan = kinds.includes('chodan')
  const hasCheongdan = kinds.includes('cheongdan')

  let ribbonPoints = 1 + (count - 5)

  // Add special ribbon bonuses (3점씩)
  if (hasHongdan) ribbonPoints += 3
  if (hasChodan) ribbonPoints += 3
  if (hasCheongdan) ribbonPoints += 3

  return { points: ribbonPoints, hasHongdan, hasChodan, hasCheongdan }
}

function calculatePiScore(piCards: readonly unknown[]): number {
  // Count double-junk as 2
  let count = 0
  for (const card of piCards as any[]) {
    if (card.type === 'double_junk') {
      count += 2
    } else {
      count += 1
    }
  }

  if (count < 10) return 0

  // 10장=1점, +1/장
  return 1 + (count - 10)
}

export function calculateScore(captured: CapturedCards): ScoreBreakdown {
  const gwangCards = getGwangCards(captured.gwang as any)
  const animalCards = getAnimalCards(captured.animal as any)
  const ribbonCards = getRibbonCards(captured.ribbon as any)
  const piCards = getPiCards(captured.pi as any)

  const gwangScore = calculateGwangScore(gwangCards)
  const animalScore = calculateAnimalScore(animalCards)
  const ribbonScore = calculateRibbonScore(ribbonCards)
  const piPoints = calculatePiScore(piCards)

  const basePoints = gwangScore.points + animalScore.points + ribbonScore.points + piPoints

  return {
    gwang: { count: gwangCards.length, points: gwangScore.points, type: gwangScore.type },
    animal: { count: animalCards.length, points: animalScore.points, hasGodori: animalScore.hasGodori },
    ribbon: { count: ribbonCards.length, hasHongdan: ribbonScore.hasHongdan, hasChodan: ribbonScore.hasChodan, hasCheongdan: ribbonScore.hasCheongdan, points: ribbonScore.points },
    pi: { count: piCards.length, points: piPoints },
    basePoints,
    multipliers: [],
    finalPoints: basePoints,
  }
}
