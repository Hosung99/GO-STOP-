import { create } from 'zustand'
import type { RoomState, PlayerInfo } from '@go-stop/shared'

interface RoomStoreState {
  readonly room: RoomState | null
  readonly myPlayerId: string | null
  setRoom: (room: RoomState) => void
  setMyPlayerId: (id: string) => void
  updatePlayerReady: (playerId: string, ready: boolean) => void
  playerJoined: (player: PlayerInfo) => void
  playerLeft: (playerId: string) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  room: null,
  myPlayerId: null,
  setRoom: (room) => set({ room }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  updatePlayerReady: (playerId, ready) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.id === playerId ? { ...p, isReady: ready } : p,
            ),
          }
        : null,
    })),
  playerJoined: (player) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: [...state.room.players, player],
          }
        : null,
    })),
  playerLeft: (playerId) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.filter((p) => p.id !== playerId),
          }
        : null,
    })),
  clearRoom: () => set({ room: null, myPlayerId: null }),
}))

export const selectIsHost = (state: RoomStoreState) =>
  state.room?.hostId === state.myPlayerId
