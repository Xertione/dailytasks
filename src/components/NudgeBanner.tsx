import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTodayStats, useTasks } from '@/hooks/useTasks'

export function NudgeBanner() {
  const { data: stats } = useTodayStats()
  const { data: tasks } = useTasks()

  const message = useMemo(() => {
    const total = stats?.total_cnt ?? 0
    const completed = stats?.completed_cnt ?? 0

    if (total === 0) {
      return '新的一天，从记录第一个任务开始吧 ✨'
    }

    if (completed === total && total > 0) {
      return '太棒了！今天全部完成 🎉'
    }

    const hasInProgress = tasks?.some((t) => t.status === 'in_progress')
    if (hasInProgress) {
      return '正在推进中，保持节奏 💪'
    }

    const pendingCount = total - completed
    return `还有 ${pendingCount} 个任务等着你呢，挑一个开始吧`
  }, [stats, tasks])

  return (
    <div
      className={cn(
        'mx-3 mt-2 px-3 py-2 rounded-md text-xs',
        'bg-accent-500/10 border border-accent-500/20',
        'text-accent-200',
      )}
    >
      {message}
    </div>
  )
}
