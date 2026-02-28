import type { Month } from '../cards/types'

export type ClientEvent =
  // Room management
  | { readonly event: 'room:create'; readonly payload: { readonly playerName: string; readonly maxPlayers: 2 | 3; readonly isPrivate: boolean } }
  | { readonly event: 'room:join'; readonly payload: { readonly roomCode: string; readonly playerName: string } }
  | { readonly event: 'room:leave'; readonly payload: { readonly roomCode: string } }
  | { readonly event: 'room:ready'; readonly payload: { readonly roomCode: string; readonly ready: boolean } }
  | { readonly event: 'room:start'; readonly payload: { readonly roomCode: string } }
  | { readonly event: 'room:kick'; readonly payload: { readonly roomCode: string; readonly targetPlayerId: string } }
  | { readonly event: 'room:chat'; readonly payload: { readonly roomCode: string; readonly message: string } }

  // Game actions
  | { readonly event: 'game:play_card'; readonly payload: { readonly cardId: string } }
  | { readonly event: 'game:choose_field_card'; readonly payload: { readonly cardId: string } }
  | { readonly event: 'game:choose_flip_match'; readonly payload: { readonly cardId: string } }
  | { readonly event: 'game:declare_go'; readonly payload: Record<string, never> }
  | { readonly event: 'game:declare_stop'; readonly payload: Record<string, never> }
  | { readonly event: 'game:declare_shake'; readonly payload: { readonly month: Month; readonly declare: boolean } }
  | { readonly event: 'game:declare_chongtong'; readonly payload: { readonly month: Month } }
  | { readonly event: 'game:request_reshuffle'; readonly payload: Record<string, never> }
  | { readonly event: 'game:accept_andae'; readonly payload: { readonly accept: boolean } }

  // Connection
  | { readonly event: 'connection:ping'; readonly payload: { readonly timestamp: number } }
  | { readonly event: 'connection:reconnect'; readonly payload: { readonly roomCode: string; readonly playerId: string; readonly token: string } }
