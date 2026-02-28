import type { HwaTuCard } from '../cards/types'

export interface GwangScore {
  readonly count: number
  readonly points: number
  readonly type: 'none' | 'samgwang' | 'bigwang' | 'ogwang'
}

export interface AnimalScore {
  readonly count: number
  readonly points: number
  readonly hasGodori: boolean
}

export interface RibbonScore {
  readonly count: number
  readonly points: number
  readonly hasHongdan: boolean
  readonly hasChodan: boolean
  readonly hasCheongdan: boolean
}

export interface PiScore {
  readonly count: number
  readonly points: number
}

export type MultiplierType =
  | 'go'
  | 'shake'
  | 'bomb'
  | 'ppuk'
  | 'meongdda'
  | 'gwangbak'
  | 'pibak'
  | 'meongbak'
  | 'nagari'

export interface Multiplier {
  readonly type: MultiplierType
  readonly value: number
}

export interface ScoreBreakdown {
  readonly gwang: GwangScore
  readonly animal: AnimalScore
  readonly ribbon: RibbonScore
  readonly pi: PiScore
  readonly basePoints: number
  readonly multipliers: readonly Multiplier[]
  readonly finalPoints: number
}

export interface CapturedCards {
  readonly gwang: readonly HwaTuCard[]
  readonly animal: readonly HwaTuCard[]
  readonly ribbon: readonly HwaTuCard[]
  readonly pi: readonly HwaTuCard[]
}
