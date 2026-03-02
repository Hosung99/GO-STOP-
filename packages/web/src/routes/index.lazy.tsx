import { useState } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { getSocket } from '../services/socket'

export function LobbyPage(): JSX.Element {
  const [roomCode, setRoomCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState<2 | 3>(2)
  const { playerName } = useAuthStore()

  function createRoom(): void {
    const socket = getSocket()
    if (!socket || !playerName) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any).emit('room:create', {
      event: 'room:create',
      payload: { playerName, maxPlayers, isPrivate: false },
    })
  }

  function joinRoom(): void {
    const socket = getSocket()
    if (!socket || !playerName || !roomCode.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any).emit('room:join', {
      event: 'room:join',
      payload: { roomCode: roomCode.trim().toUpperCase(), playerName },
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen gap-8 flex-col">
      <h1 className="text-4xl font-bold text-white">고스톱 로비</h1>
      <p className="text-gray-400">안녕하세요, {playerName}님</p>

      <div className="bg-slate-800 rounded-xl p-8 w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">방 만들기</h2>
        <div className="flex gap-2">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-2 rounded-lg font-bold ${
                maxPlayers === n ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-300'
              }`}
            >
              {n}인
            </button>
          ))}
        </div>
        <button
          onClick={createRoom}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg"
        >
          방 만들기
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-8 w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">방 참가</h2>
        <input
          className="bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          placeholder="방 코드 입력"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={5}
        />
        <button
          onClick={joinRoom}
          disabled={!roomCode.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg disabled:opacity-40"
        >
          참가하기
        </button>
      </div>
    </div>
  )
}
