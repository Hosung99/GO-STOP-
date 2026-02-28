import { useParams } from '@tanstack/react-router'

export function RoomPage(): JSX.Element {
  const { roomCode } = useParams({ from: '/room/$roomCode' })

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">방: {roomCode}</h2>
        <p className="text-gray-300">게임 로딩 중...</p>
      </div>
    </div>
  )
}
