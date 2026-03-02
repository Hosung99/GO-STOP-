import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'

export function AuthGate({ children }: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated, setGuestUser } = useAuthStore()
  const [name, setName] = useState('')

  if (isAuthenticated) return <>{children}</>

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-slate-800 p-8 rounded-xl w-80">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">🎴 고스톱</h1>
        <input
          className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-green-500"
          placeholder="닉네임 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && setGuestUser(name.trim())}
          maxLength={12}
        />
        <button
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() => setGuestUser(name.trim())}
        >
          게임 시작
        </button>
      </div>
    </div>
  )
}
