import type { GamePhase } from './types'

type PhaseName = GamePhase['phase']

export const VALID_TRANSITIONS: Record<PhaseName, readonly PhaseName[]> = {
  LOBBY: ['WAITING_FOR_PLAYERS'],
  WAITING_FOR_PLAYERS: ['DEALING', 'LOBBY'],
  DEALING: ['CHECK_SPECIAL_HANDS'],
  CHECK_SPECIAL_HANDS: ['TURN_PLAY_CARD', 'DEALING', 'ROUND_END'],
  TURN_PLAY_CARD: ['TURN_CHOOSE_FIELD_CARD', 'TURN_FLIP_DECK', 'ROUND_END'],
  TURN_CHOOSE_FIELD_CARD: ['TURN_FLIP_DECK'],
  TURN_FLIP_DECK: ['TURN_CHOOSE_FLIP_MATCH', 'TURN_RESOLVE_CAPTURE', 'ROUND_END'],
  TURN_CHOOSE_FLIP_MATCH: ['TURN_RESOLVE_CAPTURE'],
  TURN_RESOLVE_CAPTURE: ['TURN_CHECK_SCORE'],
  TURN_CHECK_SCORE: ['AWAITING_GO_STOP', 'TURN_PLAY_CARD', 'ROUND_END'],
  AWAITING_GO_STOP: ['TURN_PLAY_CARD', 'ROUND_END'],
  ROUND_END: ['DEALING', 'NAGARI', 'GAME_OVER'],
  NAGARI: ['DEALING'],
  GAME_OVER: ['LOBBY'],
  DISCONNECTED: ['TURN_PLAY_CARD', 'TURN_CHOOSE_FIELD_CARD', 'AWAITING_GO_STOP', 'ROUND_END', 'GAME_OVER'],
} as const

export function isValidTransition(from: GamePhase, to: GamePhase): boolean {
  const fromPhase = from.phase
  const toPhase = to.phase

  const validNexts = VALID_TRANSITIONS[fromPhase]
  return validNexts.includes(toPhase)
}
