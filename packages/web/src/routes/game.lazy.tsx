import { useState } from 'react'
import { useGameStore } from '../stores/game-store'
import { useRoomStore } from '../stores/room-store'
import { useUIStore } from '../stores/ui-store'
import { getSocket } from '../services/socket'
import { Card } from '../components/game/Card'
import type { HwaTuCard } from '@go-stop/shared'

export function GamePage(): JSX.Element {
  const { gameState } = useGameStore()
  const { myPlayerId, room } = useRoomStore()
  const { modals, closeModal } = useUIStore()
  const [selectedCard, setSelectedCard] = useState<HwaTuCard | null>(null)

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white text-xl">게임 로딩 중...</p>
      </div>
    )
  }

  const isMyTurn =
    gameState.phase.phase === 'TURN_PLAY_CARD' &&
    gameState.phase.currentPlayerId === myPlayerId

  function playCard(): void {
    if (!selectedCard) return
    const socket = getSocket()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any)?.emit('game:play_card', {
      event: 'game:play_card',
      payload: { cardId: selectedCard.id },
    })
    setSelectedCard(null)
  }

  function declareGo(): void {
    const socket = getSocket()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any)?.emit('game:declare_go', {
      event: 'game:declare_go',
      payload: {},
    })
    closeModal('goStop')
  }

  function declareStop(): void {
    const socket = getSocket()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(socket as any)?.emit('game:declare_stop', {
      event: 'game:declare_stop',
      payload: {},
    })
    closeModal('goStop')
  }

  // Use room players for display since ClientGameState.players may be empty for MVP
  const otherPlayers = (room?.players ?? []).filter((p) => p.id !== myPlayerId)

  return (
    <div className="min-h-screen flex flex-col gap-4 p-4">
      {/* Other players */}
      <div className="flex gap-4 justify-center">
        {otherPlayers.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-lg p-3 text-center min-w-24">
            <div className="text-white font-bold text-sm">{p.name}</div>
            <div className="text-gray-400 text-xs">상대방</div>
          </div>
        ))}
      </div>

      {/* Field cards */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-slate-900 rounded-xl p-6 min-h-36">
          <p className="text-gray-400 text-sm mb-3 text-center">
            바닥패 · 덱: {gameState.deckCount}장
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {gameState.fieldCards.map((card) => (
              <Card key={card.id} card={card} small />
            ))}
            {gameState.fieldCards.length === 0 && (
              <p className="text-gray-600">바닥패 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* My hand */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm">내 패 ({gameState.myHand.length}장)</p>
          {isMyTurn && selectedCard && (
            <button
              onClick={playCard}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1 rounded-lg text-sm"
            >
              내기
            </button>
          )}
          {isMyTurn && !selectedCard && (
            <span className="text-green-400 text-sm font-bold animate-pulse">내 차례!</span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {gameState.myHand.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCard?.id === card.id}
              onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
              disabled={!isMyTurn}
            />
          ))}
        </div>
      </div>

      {/* Go/Stop modal */}
      {modals.goStop && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-2">점수 달성!</h3>
            <p className="text-gray-400 mb-6">고 또는 스톱을 선택하세요</p>
            <div className="flex gap-4">
              <button
                onClick={declareGo}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xl"
              >
                고!
              </button>
              <button
                onClick={declareStop}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xl"
              >
                스톱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
