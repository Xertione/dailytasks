import { useCallback } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Settings, Minus } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useTasks } from '@/hooks/useTasks'
import { useTaskAnalyzedEvent, useQuickAddEvent, useShowProgressEvent, useReminderEvent, useStaleTaskEvent, useDailySummaryEvent } from '@/hooks/useTauriEvent'
import { TaskInput } from '@/components/TaskInput'
import { TaskList } from '@/components/TaskList'
import { ProgressPanel } from '@/components/ProgressPanel'
import { NudgeBanner } from '@/components/NudgeBanner'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Toast } from '@/components/Toast'

function App() {
  const { toggleSettings } = useUiStore()
  const { data: tasks, isLoading } = useTasks()

  // Tauri events
  useTaskAnalyzedEvent()
  useReminderEvent()
  useStaleTaskEvent()
  useDailySummaryEvent()

  useQuickAddEvent(
    useCallback(() => {
      window.dispatchEvent(new CustomEvent('focus-task-input'))
    }, []),
  )

  useShowProgressEvent(
    useCallback(() => {
      window.dispatchEvent(new CustomEvent('scroll-to-progress'))
    }, []),
  )

  const handleMinimize = async () => {
    await getCurrentWindow().hide()
  }

  return (
    <div className="h-screen flex flex-col bg-surface-0">
      {/* Header — backdrop-blur semi-transparent */}
      <header
        className="flex items-center justify-between px-3 py-2.5 border-b border-surface-3 shrink-0 bg-surface-0/85 backdrop-blur-md"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
          <h1 className="text-sm font-semibold text-text-primary tracking-wide select-none">
            每日任务
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSettings}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={handleMinimize}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
            title="最小化到托盘"
          >
            <Minus size={16} />
          </button>
        </div>
      </header>

      {/* Nudge banner */}
      <NudgeBanner />

      {/* Input (fixed top) */}
      <div className="shrink-0 border-b border-surface-3/50">
        <TaskInput />
      </div>

      {/* Task list (scrollable) */}
      <TaskList tasks={tasks ?? []} isLoading={isLoading} />

      {/* Bottom progress bar (always visible) */}
      <div className="shrink-0" id="progress-panel">
        <ProgressPanel />
      </div>

      {/* Settings overlay */}
      <SettingsDialog />

      {/* Toast notifications */}
      <Toast />
    </div>
  )
}

export default App
