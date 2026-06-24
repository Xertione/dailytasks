import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { ChatView } from '@/components/ChatView'
import { useUiStore } from '@/stores/uiStore'
import { useTaskAnalyzedEvent, useQuickAddEvent, useShowProgressEvent, useReminderEvent, useStaleTaskEvent, useDailySummaryEvent } from '@/hooks/useTauriEvent'
import { Clock } from '@/components/Clock'
import { NudgeBanner } from '@/components/NudgeBanner'
import { BottomNav } from '@/components/BottomNav'
import { TaskView } from '@/components/TaskView'
import { PomodoroView } from '@/components/PomodoroView'
import { HistoryView } from '@/components/HistoryView'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Toast } from '@/components/Toast'
import { OnboardingView } from '@/components/OnboardingView'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'

type Tab = 'tasks' | 'pomodoro' | 'history' | 'chat'

function App() {
  const [tab, setTab] = useState<Tab>('tasks')
  const { toggleSettings } = useUiStore()

  // Use localStorage flag instead of IPC to avoid bridge timing issues
  const configured = typeof window !== 'undefined'
    && localStorage.getItem('daily-tasks-api-key') === 'true'

  const [showOnboarding, setShowOnboarding] = useState(!configured)

  if (showOnboarding) {
    return (
      <AppErrorBoundary>
        <OnboardingView onComplete={() => {
          localStorage.setItem('daily-tasks-api-key', 'true')
          window.location.reload()
        }} />
      </AppErrorBoundary>
    )
  }

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

  return (
    <AppErrorBoundary>
    <div className="h-screen flex flex-col bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary select-none">每日任务</h1>
          <Clock />
        </div>
        <button onClick={toggleSettings} className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors">
          <Settings size={16} />
        </button>
      </header>

      {/* Nudge — always visible */}
      <NudgeBanner />

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'tasks' && <TaskView />}
        {tab === 'pomodoro' && <PomodoroView />}
        {tab === 'history' && <HistoryView />}
        {tab === 'chat' && <ChatView />}
      </div>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={(t: string) => setTab(t as Tab)} />

      <SettingsDialog />
      <Toast />
    </div>
    </AppErrorBoundary>
  )
}

export default App
