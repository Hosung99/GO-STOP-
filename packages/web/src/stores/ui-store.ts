import { create } from 'zustand'

interface UIStoreState {
  readonly modals: {
    readonly goStop: boolean
    readonly shake: boolean
    readonly chongTong: boolean
    readonly roundEnd: boolean
    readonly gameOver: boolean
  }
  readonly toasts: readonly { id: string; message: string; type: 'success' | 'error' | 'info' }[]
  openModal: (modal: keyof UIStoreState['modals']) => void
  closeModal: (modal: keyof UIStoreState['modals']) => void
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  modals: {
    goStop: false,
    shake: false,
    chongTong: false,
    roundEnd: false,
    gameOver: false,
  },
  toasts: [],
  openModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),
  closeModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),
  addToast: (message, type) =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
