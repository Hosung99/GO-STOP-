import { useRoomStore, selectIsHost } from '../stores/room-store'
import { getSocket } from '../services/socket'

export function RoomPage(): JSX.Element {
  const { room, myPlayerId } = useRoomStore()
  const isHost = useRoomStore(selectIsHost)

  function toggleReady(): void {
    const socket = getSocket()
    if (!socket || !room) return
    const me = room.players.find((p) => p.id === myPlayerId)
    ;(socket as any).emit('room:ready', {
      event: 'room:ready',
      payload: { roomCode: room.code, ready: !me?.isReady },
    })
  }

  function startGame(): void {
    const socket = getSocket()
    if (!socket || !room) return
    ;(socket as any).emit('room:start', {
      event: 'room:start',
      payload: { roomCode: room.code },
    })
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white text-xl">방 정보 로딩 중...</p>
      </div>
    )
  }

  const me = room.players.find((p) => p.id === myPlayerId)
  const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady)

  return (
    <div className="flex flex-col items-center min-h-screen p-8 gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">방 코드: {room.code}</h2>
        <p className="text-gray-400 mt-1">
          {room.players.length} / {room.maxPlayers}명
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-3">
        {room.players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{player.name}</span>
              {player.isHost && <span className="text-yellow-400 text-sm">👑</span>}
              {player.id === myPlayerId && <span className="text-blue-400 text-sm">(나)</span>}
            </div>
            <span
              className={`text-sm font-bold ${
                player.isReady ? 'text-green-400' : 'text-gray-400'
              }`}
            >
              {player.isReady ? '준비 완료' : '대기 중'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleReady}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-lg"
        >
          준비 {me?.isReady ? '취소' : '완료'}
        </button>
        {isHost && (
          <button
            onClick={startGame}
            disabled={!allReady}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-8 py-3 rounded-lg disabled:opacity-40"
          >
            게임 시작
          </button>
        )}
      </div>
    </div>
  )
}
