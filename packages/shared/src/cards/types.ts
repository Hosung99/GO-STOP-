export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type CardType = 'gwang' | 'animal' | 'ribbon' | 'junk' | 'double_junk'

export type RibbonKind = 'hongdan' | 'chodan' | 'cheongdan' | 'plain'

export interface HwaTuCard {
  readonly id: string // "1-0", "3-2" etc.
  readonly month: Month
  readonly index: number // 0-3 within month
  readonly type: CardType
  readonly ribbonKind?: RibbonKind
  readonly name: string // Korean display name
}
