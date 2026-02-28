import { create } from 'zustand'
import type { ClientGameState } from '@go-stop/shared'

interface GameStoreState {
  readonly gameState: ClientGameState | null
  readonly isLoading: boolean
  readonly error: string | null
  setGameState: (gameState: ClientGameState) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearGameState: () => void
}

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: null,
  isLoading: false,
  error: null,
  setGameState: (gameState) => set({ gameState, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearGameState: () => set({ gameState: null, error: null }),
}))
