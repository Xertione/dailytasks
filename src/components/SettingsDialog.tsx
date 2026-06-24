import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore, type NudgeStyle } from '@/stores/uiStore'
import { useTasks, useTodayStats } from '@/hooks/useTasks'

const nudgeOptions: { value: NudgeStyle; label: string; desc: string }[] = [
  { value: 'gentle', label: '温和', desc: '轻柔鼓励，适合压力大的时候' },
  { value: 'direct', label: '直接', desc: '直截了当，高效推动' },
  { value: 'humorous', label: '幽默', desc: '轻松调侃，缓解焦虑' },
]

export function SettingsDialog() {
  const {
    isSettingsOpen,
    closeSettings,
    nudgeStyle,
    setNudgeStyle,
  } = useUiStore()

  const { data: tasks } = useTasks()
  const { data: stats } = useTodayStats()

  if (!isSettingsOpen) return null

  const totalTasks = stats?.total_cnt ?? (tasks?.length ?? 0)
  const completedTasks = stats?.completed_cnt ?? (tasks?.filter(t => t.status === 'done').length ?? 0)
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Dialog */}
      <div className="relative bg-surface-1 border border-surface-3 rounded-xl w-[340px] max-h-[80%] overflow-y-auto shadow-modal animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
          <h2 className="text-sm font-medium text-text-primary">设置</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Nudge style */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              鼓励话术风格
            </label>
            <div className="space-y-1.5">
              {nudgeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNudgeStyle(option.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150',
                    nudgeStyle === option.value
                      ? 'bg-accent-500/10 border border-accent-500/30 text-accent-200'
                      : 'bg-surface-2 border border-transparent text-text-secondary hover:bg-surface-2/80',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="block text-[11px] text-text-tertiary mt-0.5">
                    {option.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shortcut info */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              全局快捷键
            </label>
            <div className="space-y-1.5 text-[11px] text-text-tertiary">
              <div className="flex justify-between items-center">
                <span>显示/隐藏窗口</span>
                <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-text-secondary text-[10px] font-mono shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">
                  Ctrl+Shift+T
                </kbd>
              </div>
            </div>
          </div>

          {/* Data stats */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              数据统计
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-2 rounded-md p-3 text-center">
                <div className="text-2xl font-semibold text-text-primary tabular-nums">
                  {totalTasks}
                </div>
                <div className="text-[10px] text-text-tertiary mt-0.5">总任务数</div>
              </div>
              <div className="bg-surface-2 rounded-md p-3 text-center">
                <div className="text-2xl font-semibold text-text-primary tabular-nums">
                  {completionRate}%
                </div>
                <div className="text-[10px] text-text-tertiary mt-0.5">完成率</div>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="text-center text-[10px] text-text-disabled pt-1">
            每日任务 v0.1.0
          </div>
        </div>
      </div>
    </div>
  )
}
