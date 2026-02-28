import type { HwaTuCard, Month } from './types'

// All 48 cards in Go-Stop (화투)
export const CARD_DEFINITIONS: readonly HwaTuCard[] = [
  // Month 1: 송학 (Pine/Crane)
  { id: '1-0', month: 1, index: 0, type: 'gwang', name: '1월 광(학)' },
  { id: '1-1', month: 1, index: 1, type: 'ribbon', ribbonKind: 'hongdan', name: '1월 홍단' },
  { id: '1-2', month: 1, index: 2, type: 'junk', name: '1월 피' },
  { id: '1-3', month: 1, index: 3, type: 'junk', name: '1월 피' },

  // Month 2: 매조 (Plum/Nightingale)
  { id: '2-0', month: 2, index: 0, type: 'animal', name: '2월 동물(꾀꼬리)' },
  { id: '2-1', month: 2, index: 1, type: 'ribbon', ribbonKind: 'hongdan', name: '2월 홍단' },
  { id: '2-2', month: 2, index: 2, type: 'junk', name: '2월 피' },
  { id: '2-3', month: 2, index: 3, type: 'junk', name: '2월 피' },

  // Month 3: 벚꽃 (Cherry/Curtain)
  { id: '3-0', month: 3, index: 0, type: 'gwang', name: '3월 광(막)' },
  { id: '3-1', month: 3, index: 1, type: 'ribbon', ribbonKind: 'hongdan', name: '3월 홍단' },
  { id: '3-2', month: 3, index: 2, type: 'junk', name: '3월 피' },
  { id: '3-3', month: 3, index: 3, type: 'junk', name: '3월 피' },

  // Month 4: 흑싸리 (Wisteria)
  { id: '4-0', month: 4, index: 0, type: 'animal', name: '4월 동물(두견새)' },
  { id: '4-1', month: 4, index: 1, type: 'ribbon', ribbonKind: 'chodan', name: '4월 초단' },
  { id: '4-2', month: 4, index: 2, type: 'junk', name: '4월 피' },
  { id: '4-3', month: 4, index: 3, type: 'junk', name: '4월 피' },

  // Month 5: 난초 (Orchid/Iris)
  { id: '5-0', month: 5, index: 0, type: 'animal', name: '5월 동물(다리)' },
  { id: '5-1', month: 5, index: 1, type: 'ribbon', ribbonKind: 'chodan', name: '5월 초단' },
  { id: '5-2', month: 5, index: 2, type: 'junk', name: '5월 피' },
  { id: '5-3', month: 5, index: 3, type: 'junk', name: '5월 피' },

  // Month 6: 모란 (Peony)
  { id: '6-0', month: 6, index: 0, type: 'animal', name: '6월 동물(나비)' },
  { id: '6-1', month: 6, index: 1, type: 'ribbon', ribbonKind: 'cheongdan', name: '6월 청단' },
  { id: '6-2', month: 6, index: 2, type: 'junk', name: '6월 피' },
  { id: '6-3', month: 6, index: 3, type: 'junk', name: '6월 피' },

  // Month 7: 홍싸리 (Red Clover)
  { id: '7-0', month: 7, index: 0, type: 'animal', name: '7월 동물(멧돼지)' },
  { id: '7-1', month: 7, index: 1, type: 'ribbon', ribbonKind: 'chodan', name: '7월 초단' },
  { id: '7-2', month: 7, index: 2, type: 'junk', name: '7월 피' },
  { id: '7-3', month: 7, index: 3, type: 'junk', name: '7월 피' },

  // Month 8: 공산 (Susuki/Moon)
  { id: '8-0', month: 8, index: 0, type: 'gwang', name: '8월 광(달)' },
  { id: '8-1', month: 8, index: 1, type: 'animal', name: '8월 동물(기러기)' },
  { id: '8-2', month: 8, index: 2, type: 'junk', name: '8월 피' },
  { id: '8-3', month: 8, index: 3, type: 'junk', name: '8월 피' },

  // Month 9: 국진 (Chrysanthemum)
  { id: '9-0', month: 9, index: 0, type: 'animal', name: '9월 동물(술잔)' },
  { id: '9-1', month: 9, index: 1, type: 'ribbon', ribbonKind: 'cheongdan', name: '9월 청단' },
  { id: '9-2', month: 9, index: 2, type: 'junk', name: '9월 피' },
  { id: '9-3', month: 9, index: 3, type: 'double_junk', name: '9월 쌍피' },

  // Month 10: 단풍 (Maple)
  { id: '10-0', month: 10, index: 0, type: 'animal', name: '10월 동물(사슴)' },
  { id: '10-1', month: 10, index: 1, type: 'ribbon', ribbonKind: 'cheongdan', name: '10월 청단' },
  { id: '10-2', month: 10, index: 2, type: 'junk', name: '10월 피' },
  { id: '10-3', month: 10, index: 3, type: 'junk', name: '10월 피' },

  // Month 11: 오동 (Paulownia)
  { id: '11-0', month: 11, index: 0, type: 'gwang', name: '11월 광(봉황)' },
  { id: '11-1', month: 11, index: 1, type: 'junk', name: '11월 피' },
  { id: '11-2', month: 11, index: 2, type: 'junk', name: '11월 피' },
  { id: '11-3', month: 11, index: 3, type: 'double_junk', name: '11월 쌍피' },

  // Month 12: 비 (Rain/Willow)
  { id: '12-0', month: 12, index: 0, type: 'gwang', name: '12월 광(비)' },
  { id: '12-1', month: 12, index: 1, type: 'animal', name: '12월 동물(제비)' },
  { id: '12-2', month: 12, index: 2, type: 'ribbon', ribbonKind: 'plain', name: '12월 띠' },
  { id: '12-3', month: 12, index: 3, type: 'double_junk', name: '12월 쌍피' },
]

export const MONTH_NAMES: Record<Month, string> = {
  1: '송학(1월)',
  2: '매조(2월)',
  3: '벚꽃(3월)',
  4: '흑싸리(4월)',
  5: '난초(5월)',
  6: '모란(6월)',
  7: '홍싸리(7월)',
  8: '공산(8월)',
  9: '국진(9월)',
  10: '단풍(10월)',
  11: '오동(11월)',
  12: '비(12월)',
}

export function getCardsByMonth(cards: readonly HwaTuCard[], month: Month): readonly HwaTuCard[] {
  return cards.filter((card) => card.month === month)
}

export function getGwangCards(cards: readonly HwaTuCard[]): readonly HwaTuCard[] {
  return cards.filter((card) => card.type === 'gwang')
}

export function getAnimalCards(cards: readonly HwaTuCard[]): readonly HwaTuCard[] {
  return cards.filter((card) => card.type === 'animal')
}

export function getRibbonCards(cards: readonly HwaTuCard[]): readonly HwaTuCard[] {
  return cards.filter((card) => card.type === 'ribbon')
}

export function getPiCards(cards: readonly HwaTuCard[]): readonly HwaTuCard[] {
  return cards.filter((card) => card.type === 'junk' || card.type === 'double_junk')
}
