import type { HwaTuCard } from '@go-stop/shared'

const TYPE_COLORS: Record<string, string> = {
  gwang: 'from-yellow-700 to-yellow-500 border-yellow-400',
  animal: 'from-green-800 to-green-600 border-green-400',
  ribbon: 'from-red-800 to-red-600 border-red-400',
  junk: 'from-slate-700 to-slate-600 border-slate-400',
  double_junk: 'from-slate-700 to-slate-500 border-blue-400',
}

interface CardProps {
  card: HwaTuCard
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  small?: boolean
}

export function Card({ card, selected, onClick, disabled, small }: CardProps): JSX.Element {
  const colors = TYPE_COLORS[card.type] ?? TYPE_COLORS['junk']!
  const size = small ? 'w-10 h-14 text-xs' : 'w-16 h-24 text-sm'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        size,
        'rounded-lg border-2 bg-gradient-to-b',
        colors,
        'flex flex-col items-center justify-between p-1',
        'transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
        selected ? 'ring-2 ring-white scale-110 -translate-y-2' : '',
      ].join(' ')}
    >
      <span className="text-white font-bold">{card.month}월</span>
      <span className="text-gray-200 text-center leading-tight text-xs">{card.name}</span>
      <span className="text-gray-300 text-xs">{card.type[0]?.toUpperCase()}</span>
    </button>
  )
}
