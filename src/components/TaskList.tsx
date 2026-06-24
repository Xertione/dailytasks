import { useState } from 'react'
import { ChevronDown, ClipboardList } from 'lucide-react'
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
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
          <ClipboardList size={32} className="text-surface-3" />
        </div>
        <p className="text-text-primary text-sm font-medium">开始你的第一项任务吧</p>
        <p className="text-text-tertiary text-xs -mt-1">记录一个任务，AI 会帮你分析优先级</p>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('set-draft-text', { detail: '试用一下：写一份周报' }))
          }}
          className={cn(
            'mt-1 text-xs text-accent-400 px-3 py-1.5 rounded-md',
            'border border-accent-400/30 hover:bg-accent-400/10',
            'transition-colors duration-150',
          )}
        >
          试用一下
        </button>
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
    <div
      className="flex-1 overflow-y-auto px-3 py-1 space-y-4"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const cards = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>('[data-task-id]'),
          )
          if (cards.length === 0) return
          const focused = cards.findIndex((c) => c === document.activeElement)
          const nextIdx =
            e.key === 'ArrowDown'
              ? Math.min(focused + 1, cards.length - 1)
              : Math.max(focused - 1, 0)
          cards[nextIdx]?.focus()
        }
      }}
    >
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
