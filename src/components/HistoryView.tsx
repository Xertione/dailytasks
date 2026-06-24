import { format } from 'date-fns'
import { ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTasks } from '@/hooks/useTasks'

export function HistoryView() {
  const { data: tasks, isLoading } = useTasks()

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-tertiary text-sm">加载中...</div>
      </div>
    )
  }

  const doneTasks = (tasks ?? [])
    .filter((t) => t.status === 'done')
    .sort((a, b) => {
      const da = a.completed_at ? new Date(a.completed_at).getTime() : 0
      const db = b.completed_at ? new Date(b.completed_at).getTime() : 0
      return db - da
    })

  const totalStars = doneTasks.reduce((sum, t) => sum + t.star_value, 0)

  if (doneTasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
          <ClipboardCheck size={32} className="text-surface-3" />
        </div>
        <p className="text-text-secondary text-sm">还没有完成过任务</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats header */}
      <div className="shrink-0 px-4 py-3 border-b border-surface-3 flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          总共完成 <span className="text-text-primary font-medium tabular-nums">{doneTasks.length}</span> 个任务
        </span>
        <span className="text-xs text-text-secondary">
          累计 <span className="text-amber-400 font-medium tabular-nums">{totalStars}</span> 颗星
        </span>
      </div>

      {/* Done task list */}
      <div className="flex-1 overflow-y-auto">
        {doneTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-3/50"
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                'text-xs font-semibold tabular-nums',
                task.star_value === 0
                  ? 'bg-surface-2 text-text-disabled'
                  : task.star_value <= 3
                    ? 'bg-blue-400/10 text-blue-400 border border-blue-400/30'
                    : task.star_value <= 6
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                      : 'bg-orange-400/10 text-orange-400 border border-orange-400/30',
              )}
            >
              {task.star_value || '-'}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary line-through truncate">
                {task.title}
              </p>
              {task.completion_note && (
                <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                  {task.completion_note}
                </p>
              )}
            </div>

            <span className="text-[11px] text-text-disabled tabular-nums shrink-0">
              {task.completed_at
                ? format(new Date(task.completed_at), 'MM/dd HH:mm')
                : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
