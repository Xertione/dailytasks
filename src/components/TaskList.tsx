import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/ipc'
import { TaskCard } from './TaskCard'

interface TaskGroup {
  label: string
  key: Task['status']
  dotColor: string
}

const groups: TaskGroup[] = [
  { label: '进行中', key: 'in_progress', dotColor: 'bg-accent-400' },
  { label: '待处理', key: 'pending', dotColor: 'bg-surface-3' },
  { label: '已完成', key: 'done', dotColor: 'bg-success' },
]

interface TaskListProps {
  tasks: Task[]
  isLoading?: boolean
}

export function TaskList({ tasks, isLoading }: TaskListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-tertiary text-sm">加载中...</div>
      </div>
    )
  }

  if (!tasks.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center">
          <Sparkles size={28} className="text-surface-3" />
        </div>
        <p className="text-text-secondary text-sm">还没有任务</p>
        <p className="text-text-tertiary text-xs">在上方输入框记录一个任务吧</p>
      </div>
    )
  }

  const grouped = groups
    .map((group) => {
      const items = tasks.filter((t) => t.status === group.key)
      return { ...group, items }
    })
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
      {grouped.map((group) => (
        <div key={group.key}>
          {/* Group header */}
          <button
            type="button"
            onClick={() => toggleGroup(group.key)}
            className="flex items-center gap-2 w-full text-left mb-2 px-0.5 group/header"
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', group.dotColor)} />
            <span className="text-xs font-medium text-text-secondary">
              {group.label}
            </span>
            <span className="text-[10px] text-text-disabled bg-surface-2 rounded-full px-1.5 py-px font-medium tabular-nums min-w-[18px] text-center">
              {group.items.length}
            </span>
            <ChevronDown
              size={12}
              className={cn(
                'text-text-disabled transition-transform duration-200 ml-auto',
                collapsed[group.key] && '-rotate-90',
              )}
            />
          </button>

          {/* Cards */}
          <div
            className={cn(
              'grid transition-all duration-300 ease-out',
              collapsed[group.key]
                ? 'grid-rows-[0fr] opacity-0'
                : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className={cn(
              collapsed[group.key] ? 'overflow-hidden' : '',
            )}>
              <div className="space-y-1.5">
                {group.items.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
