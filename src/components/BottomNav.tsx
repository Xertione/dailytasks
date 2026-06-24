import { ListTodo, Timer, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  active: string
  onChange: (tab: string) => void
}

const tabs = [
  { key: 'tasks', label: '任务', Icon: ListTodo },
  { key: 'pomodoro', label: '番茄钟', Icon: Timer },
  { key: 'history', label: '历史', Icon: History },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="shrink-0 flex border-t border-surface-3 bg-surface-0">
      {tabs.map(({ key, label, Icon }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2',
              'text-xs transition-colors duration-150',
              isActive
                ? 'text-amber-400'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Icon size={16} />
            <span className="text-[10px] leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
