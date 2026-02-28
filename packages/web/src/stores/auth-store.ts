import { create } from 'zustand'

interface AuthState {
  readonly userId: string | null
  readonly playerName: string | null
  readonly isGuest: boolean
  readonly isAuthenticated: boolean
  setAuthUser: (userId: string, playerName: string, isGuest: boolean) => void
  setGuestUser: (playerName: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  playerName: null,
  isGuest: true,
  isAuthenticated: false,
  setAuthUser: (userId, playerName, isGuest) =>
    set({
      userId,
      playerName,
      isGuest,
      isAuthenticated: true,
    }),
  setGuestUser: (playerName) =>
    set({
      userId: crypto.randomUUID(),
      playerName,
      isGuest: true,
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      userId: null,
      playerName: null,
      isGuest: true,
      isAuthenticated: false,
    }),
}))
