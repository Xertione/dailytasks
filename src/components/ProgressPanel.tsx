import { Flame, Clock } from 'lucide-react'
import { useTodayStats, useTasks } from '@/hooks/useTasks'

export function ProgressPanel() {
  const { data: stats, isLoading } = useTodayStats()
  const { data: tasks } = useTasks()

  if (isLoading || !stats) {
    return (
      <div className="px-3 py-2.5 border-t border-surface-3">
        <div className="h-8 animate-pulse bg-surface-2 rounded-md" />
      </div>
    )
  }

  const total = stats.total_cnt
  const completed = stats.completed_cnt
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Calculate estimated hours from tasks
  const estimatedHours = tasks
    ? Math.round((tasks.reduce((sum, t) => sum + t.estimated_min, 0) / 60) * 10) / 10
    : 0

  if (total === 0) {
    return (
      <div className="px-3 py-2.5 border-t border-surface-3">
        <p className="text-xs text-text-tertiary text-center">
          还没有任务，添加第一个吧 ✨
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 py-2.5 border-t border-surface-3">
      {/* Progress bar */}
      <div className="h-1.5 bg-surface-2 rounded-full mb-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: percent > 0
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'transparent',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-text-secondary">
          <span className="tabular-nums">
            {completed}/{total} 已完成
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Clock size={11} />
            {estimatedHours}h
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stats.total_stars > 0 && (
            <span className="text-accent-400 font-medium tabular-nums">
              ⭐ {stats.total_stars} 颗星
            </span>
          )}
          {stats.high_star_cnt > 0 && (
            <>
              <Flame size={12} className="text-accent-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.5)]" />
              <span className="text-accent-400 font-medium tabular-nums">
                {stats.high_star_cnt}高星
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
