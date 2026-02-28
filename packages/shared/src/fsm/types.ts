export type GamePhase =
  | { readonly phase: 'LOBBY' }
  | { readonly phase: 'WAITING_FOR_PLAYERS'; readonly roomCode: string }
  | { readonly phase: 'DEALING'; readonly roundNumber: number }
  | { readonly phase: 'CHECK_SPECIAL_HANDS' }
  | { readonly phase: 'TURN_PLAY_CARD'; readonly currentPlayerId: string; readonly timeoutAt: number }
  | {
      readonly phase: 'TURN_CHOOSE_FIELD_CARD'
      readonly currentPlayerId: string
      readonly matchOptions: readonly string[]
      readonly timeoutAt: number
    }
  | { readonly phase: 'TURN_FLIP_DECK'; readonly currentPlayerId: string; readonly timeoutAt: number }
  | {
      readonly phase: 'TURN_CHOOSE_FLIP_MATCH'
      readonly currentPlayerId: string
      readonly matchOptions: readonly string[]
      readonly timeoutAt: number
    }
  | { readonly phase: 'TURN_RESOLVE_CAPTURE'; readonly currentPlayerId: string }
  | { readonly phase: 'TURN_CHECK_SCORE'; readonly currentPlayerId: string }
  | {
      readonly phase: 'AWAITING_GO_STOP'
      readonly currentPlayerId: string
      readonly currentScore: number
      readonly goCount: number
      readonly timeoutAt: number
    }
  | { readonly phase: 'ROUND_END'; readonly winnerId: string | null; readonly scoreBreakdown: unknown }
  | { readonly phase: 'NAGARI'; readonly nagariCount: number }
  | { readonly phase: 'GAME_OVER'; readonly finalResults: unknown }
  | { readonly phase: 'DISCONNECTED'; readonly disconnectedPlayerId: string; readonly timeoutAt: number }
