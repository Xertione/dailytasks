import { useEffect } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useQueryClient } from '@tanstack/react-query'

// Rust queue.rs emits: { task_id, star_value, star_reason } on success
// or { task_id, error } on failure
interface TaskAnalyzedPayload {
  task_id: string
  star_value?: number
  star_reason?: string
  error?: string
}

export function useTaskAnalyzedEvent() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen<TaskAnalyzedPayload>('task:analyzed', (event) => {
        if (event.payload.error) {
          console.warn('AI analysis error:', event.payload.error)
        }
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      })
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [queryClient])
}

// Scheduler events — also invalidate tasks/stats when reminders fire
export function useReminderEvent() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen('task-reminder', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['todayStats'] })
      })
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [queryClient])
}

export function useStaleTaskEvent() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen('task-stale', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      })
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [queryClient])
}

export function useDailySummaryEvent() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen<{ message: string; completed: number; total: number }>(
        'daily-summary',
        () => {
          queryClient.invalidateQueries({ queryKey: ['todayStats'] })
        },
      )
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [queryClient])
}

export function useQuickAddEvent(onTrigger: () => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen('app:quick-add', () => {
        onTrigger()
      })
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [onTrigger])
}

export function useShowProgressEvent(onTrigger: () => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined
    const setup = async () => {
      unlisten = await listen('app:show-progress', () => {
        onTrigger()
      })
    }
    setup()
    return () => {
      if (unlisten) unlisten()
    }
  }, [onTrigger])
}
