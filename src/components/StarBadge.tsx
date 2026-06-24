import { cn } from '@/lib/utils'

interface StarBadgeProps {
  rating: number
  reason?: string
  onClick?: () => void
  className?: string
}

function getConfig(rating: number): { color: string; bg: string; border: string; label: string } {
  if (rating === 0) {
    return {
      color: 'text-text-disabled',
      bg: 'bg-transparent',
      border: 'border-dashed border-surface-3',
      label: '分析中',
    }
  }
  if (rating <= 3) {
    return {
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30',
      label: `${rating}`,
    }
  }
  if (rating <= 6) {
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30',
      label: `${rating}`,
    }
  }
  // 7-10
  return {
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
    label: `${rating}⭐`,
  }
}

export function StarBadge({ rating, reason, onClick, className }: StarBadgeProps) {
  const config = getConfig(rating)

  return (
    <button
      type="button"
      onClick={onClick}
      title={reason}
      className={cn(
        'inline-flex items-center justify-center rounded-full w-8 h-8 text-xs font-semibold',
        'border transition-all duration-150',
        'hover:-translate-y-px hover:bg-surface-2',
        config.color,
        config.bg,
        config.border,
        rating === 0 && 'animate-[pulse-glow_2s_ease-in-out_infinite]',
        className,
      )}
    >
      {rating === 0 ? (
        <span className="text-[9px] text-text-disabled">{config.label}</span>
      ) : (
        <span>{config.label}</span>
      )}
    </button>
  )
}
