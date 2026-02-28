import type { HwaTuCard, Month } from '../cards/types'

export type ServerEvent =
  // Room state
  | { readonly event: 'room:created'; readonly payload: { readonly roomCode: string; readonly room: unknown } }
  | { readonly event: 'room:joined'; readonly payload: { readonly room: unknown; readonly playerId: string } }
  | { readonly event: 'room:player_joined'; readonly payload: { readonly player: unknown } }
  | { readonly event: 'room:player_left'; readonly payload: { readonly playerId: string } }
  | { readonly event: 'room:player_ready'; readonly payload: { readonly playerId: string; readonly ready: boolean } }
  | { readonly event: 'room:player_kicked'; readonly payload: { readonly playerId: string } }
  | { readonly event: 'room:chat_message'; readonly payload: { readonly playerId: string; readonly playerName: string; readonly message: string; readonly timestamp: number } }
  | { readonly event: 'room:countdown'; readonly payload: { readonly seconds: number } }

  // Game lifecycle
  | { readonly event: 'game:started'; readonly payload: { readonly gameState: unknown } }
  | { readonly event: 'game:dealt'; readonly payload: { readonly hand: readonly HwaTuCard[]; readonly fieldCards: readonly HwaTuCard[]; readonly deckCount: number } }
  | { readonly event: 'game:special_hand_check'; readonly payload: { readonly checks: unknown } }

  // Turn flow
  | { readonly event: 'game:turn_start'; readonly payload: { readonly currentPlayerId: string; readonly timeLimit: number } }
  | { readonly event: 'game:card_played'; readonly payload: { readonly playerId: string; readonly card: HwaTuCard; readonly matchOptions: readonly HwaTuCard[] } }
  | { readonly event: 'game:field_card_chosen'; readonly payload: { readonly playerId: string; readonly card: HwaTuCard } }
  | { readonly event: 'game:deck_flipped'; readonly payload: { readonly card: HwaTuCard; readonly matchOptions: readonly HwaTuCard[] } }
  | { readonly event: 'game:flip_match_chosen'; readonly payload: { readonly playerId: string; readonly card: HwaTuCard } }
  | { readonly event: 'game:capture'; readonly payload: { readonly playerId: string; readonly captured: readonly HwaTuCard[]; readonly bonuses: readonly unknown[] } }
  | { readonly event: 'game:field_updated'; readonly payload: { readonly fieldCards: readonly HwaTuCard[] } }
  | { readonly event: 'game:pi_transfer'; readonly payload: { readonly from: string; readonly to: string; readonly count: number; readonly reason: string } }

  // Scoring & decisions
  | { readonly event: 'game:score_check'; readonly payload: { readonly playerId: string; readonly score: number; readonly breakdown: unknown; readonly canGoStop: boolean } }
  | { readonly event: 'game:go_declared'; readonly payload: { readonly playerId: string; readonly goCount: number } }
  | { readonly event: 'game:stop_declared'; readonly payload: { readonly playerId: string } }
  | { readonly event: 'game:shake_declared'; readonly payload: { readonly playerId: string; readonly month: Month } }
  | { readonly event: 'game:chongtong_declared'; readonly payload: { readonly playerId: string; readonly month: Month; readonly cards: readonly HwaTuCard[] } }

  // Round/game end
  | { readonly event: 'game:round_end'; readonly payload: { readonly winner: string | null; readonly scoreBreakdown: unknown; readonly finalScore: number; readonly multipliers: readonly unknown[] } }
  | { readonly event: 'game:nagari'; readonly payload: { readonly nagariCount: number } }
  | { readonly event: 'game:over'; readonly payload: { readonly results: readonly unknown[] } }

  // Connection
  | { readonly event: 'connection:pong'; readonly payload: { readonly timestamp: number; readonly serverTime: number } }
  | { readonly event: 'connection:player_disconnected'; readonly payload: { readonly playerId: string; readonly timeout: number } }
  | { readonly event: 'connection:player_reconnected'; readonly payload: { readonly playerId: string } }

  // Errors
  | { readonly event: 'error:invalid_action'; readonly payload: { readonly message: string; readonly code: string } }
  | { readonly event: 'error:room'; readonly payload: { readonly message: string; readonly code: string } }
  | { readonly event: 'error:game'; readonly payload: { readonly message: string; readonly code: string } }
