import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarBadgeProps {
  rating: number
  reason?: string
  onClick?: () => void
  className?: string
}

const ratingConfig: Record<number, { color: string; label: string }> = {
  0: { color: 'text-text-disabled', label: '分析中...' },
  1: { color: 'text-blue-400', label: '普通' },
  2: { color: 'text-accent-400', label: '重要' },
  3: { color: 'text-orange-400', label: '紧急' },
}

export function StarBadge({ rating, reason, onClick, className }: StarBadgeProps) {
  const config = ratingConfig[rating] ?? ratingConfig[0]
  const stars = Array.from({ length: 3 })

  return (
    <button
      type="button"
      onClick={onClick}
      title={reason}
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5',
        'transition-all duration-150',
        'hover:-translate-y-px hover:bg-surface-2',
        rating === 0 && 'border border-dashed border-surface-3 animate-[pulse-glow_2s_ease-in-out_infinite]',
        className,
      )}
    >
      {stars.map((_, i) => (
        <Star
          key={i}
          size={14}
          className={cn(
            i < rating
              ? cn('fill-current', config.color)
              : 'text-surface-3',
            'transition-colors duration-150',
            rating === 0 && 'animate-pulse',
          )}
        />
      ))}
      <span className={cn('text-[10px] ml-0.5', config.color)}>
        {config.label}
      </span>
    </button>
  )
}
