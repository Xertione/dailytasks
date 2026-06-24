import { useState, useRef, useEffect } from 'react'
import { Trash2, Check, Clock, FileText } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/ipc'
import { useUpdateTask, useUpdateProgress, useDeleteTask, useCompleteWithNote } from '@/hooks/useTasks'
import { StarBadge } from './StarBadge'
import { CompletionDialog } from './CompletionDialog'

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const [showStarPicker, setShowStarPicker] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [countdownRemaining, setCountdownRemaining] = useState(0)
  const [countdownFlash, setCountdownFlash] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateTask = useUpdateTask()
  const updateProgress = useUpdateProgress()
  const deleteTask = useDeleteTask()
  const completeWithNote = useCompleteWithNote()

  const isDone = task.status === 'done'
  const deadlinePast = task.due_at && isPast(new Date(task.due_at)) && !isDone
  const deadlineToday = task.due_at && isToday(new Date(task.due_at))

  // Sync countdown remaining from task
  useEffect(() => {
    setCountdownRemaining(task.countdown_secs || 0)
  }, [task.countdown_secs])

  // Countdown tick
  useEffect(() => {
    if (countdownRemaining > 0 && task.status !== 'done') {
      countdownRef.current = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev <= 1) {
            setCountdownFlash(true)
            setTimeout(() => setCountdownFlash(false), 3000)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [countdownRemaining, task.status])

  // Close star picker when clicking outside
  useEffect(() => {
    if (!showStarPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-star-picker]')) {
        setShowStarPicker(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showStarPicker])

  const handleStatusClick = () => {
    handleStatusChange()
  }

  const handleStatusChange = async () => {
    try {
      if (task.status === 'pending') {
        await updateTask.mutateAsync({
          id: task.id,
          title: task.title,
          description: task.description,
          status: 'in_progress',
          progress: 25,
          star_value: task.star_value,
          due_at: task.due_at,
          remind_at: task.remind_at,
        })
      } else if (task.status === 'done') {
        await updateTask.mutateAsync({
          id: task.id,
          title: task.title,
          description: task.description,
          status: 'in_progress',
          progress: 100,
          star_value: task.star_value,
          due_at: task.due_at,
          remind_at: task.remind_at,
        })
      } else if (task.status === 'in_progress') {
        await completeWithNote.mutateAsync({ id: task.id, note: '' })
      }
    } catch (err) {
      console.error('Status change failed:', err)
    }
  }

  const handleCompletionDialogComplete = async (note: string) => {
    setShowCompletionDialog(false)
    try {
      await completeWithNote.mutateAsync({ id: task.id, note })
    } catch (err) {
      console.error('Complete failed:', err)
    }
  }

  const handleProgressChange = async (pct: number) => {
    await updateProgress.mutateAsync({ id: task.id, progress: pct })
  }

  const handleStarChange = async (rating: number) => {
    setShowStarPicker(false)
    await updateTask.mutateAsync({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      progress: task.progress,
      star_value: rating,
      due_at: task.due_at,
      remind_at: task.remind_at,
    })
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id)
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '任务已删除', action: 'undo', taskId: task.id, taskTitle: task.title },
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleStatusClick()
    } else if (e.key === 'Delete') {
      e.preventDefault()
      handleDelete()
    }
  }

  return (
    <>
      <div
        tabIndex={0}
        data-task-id={task.id}
        onKeyDown={handleKeyDown}
        className={cn(
          'group bg-surface-1 border border-surface-3 rounded-lg p-3',
          'hover:-translate-y-px hover:border-surface-3/80 hover:bg-surface-1/80',
          'transition-all duration-200',
          'animate-scale-in',
          isDone && 'opacity-60',
        )}
      >
        <div className="flex items-start gap-2.5">
          {/* Status circle */}
          <button
            type="button"
            onClick={handleStatusClick}
            title={task.status === 'done' ? '点击回退到进行中' : undefined}
            className={cn(
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              'transition-all duration-200 hover:scale-110',
              task.status === 'pending' && 'border-surface-3 hover:border-accent-400',
              task.status === 'in_progress' && 'border-accent-400 bg-accent-400/20',
              task.status === 'done' && 'border-success bg-transparent hover:border-amber-400 hover:bg-amber-400/10',
            )}
          >
            {task.status === 'done' && (
              <Check size={11} className="text-success" strokeWidth={3} />
            )}
            {task.status === 'in_progress' && (
              <div className={cn(
                'w-2 h-2 rounded-full bg-accent-400',
                'animate-[pulse-glow_2s_ease-in-out_infinite]',
              )} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'text-sm leading-tight flex-1',
                  isDone
                    ? 'line-through text-text-disabled'
                    : 'text-text-primary',
                )}
              >
                {task.title}
              </p>
            </div>

            {/* Countdown display */}
            {countdownRemaining > 0 && task.status !== 'done' && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-0.5 text-xs tabular-nums',
                  countdownFlash ? 'text-danger animate-pulse' : 'text-amber-400',
                  countdownRemaining <= 60 && !countdownFlash && 'text-amber-500',
                )}
              >
                <span>⏱</span>
                <span>{formatCountdown(countdownRemaining)}</span>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Star badge */}
              <div className="relative z-40" data-star-picker>
                <StarBadge
                  rating={task.star_value}
                  reason={task.star_reason}
                  onClick={() => setShowStarPicker(!showStarPicker)}
                />

                {showStarPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-1 border border-surface-3 rounded-md p-1.5 z-10 shadow-elevated animate-scale-in" style={{ zIndex: 100 }}>
                    {/* Row 1: 1-5 */}
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleStarChange(r)}
                          className={cn(
                            'w-7 h-7 rounded text-xs font-medium transition-colors duration-150',
                            'hover:bg-surface-2',
                            r <= 3 ? 'text-blue-400' : 'text-amber-400',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {/* Row 2: 6-10 */}
                    <div className="flex gap-1">
                      {[6, 7, 8, 9, 10].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleStarChange(r)}
                          className={cn(
                            'w-7 h-7 rounded text-xs font-medium transition-colors duration-150',
                            'hover:bg-surface-2',
                            'text-orange-400',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline */}
              {task.due_at && (
                <span
                  className={cn(
                    'text-[11px] flex items-center gap-0.5',
                    deadlinePast
                      ? 'text-danger'
                      : deadlineToday
                        ? 'text-accent-400'
                        : 'text-text-tertiary',
                  )}
                >
                  <Clock size={10} />
                  {format(new Date(task.due_at), 'MM/dd HH:mm')}
                </span>
              )}

              {/* AI analysis reason */}
              {task.star_reason && (
                <span className="text-[10px] text-text-disabled italic truncate max-w-[120px]">
                  {task.star_reason}
                </span>
              )}
            </div>

            {/* Progress indicator */}
            {task.status === 'in_progress' && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] text-text-tertiary mr-1">进度</span>
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleProgressChange(pct)}
                    className={cn(
                      'w-5 h-1.5 rounded-full transition-all duration-200',
                      task.progress >= pct ? 'bg-accent-500' : 'bg-surface-3',
                      task.progress === pct && 'ring-1 ring-accent-400/50',
                    )}
                    title={`${pct}%`}
                  />
                ))}
                <span className="text-[10px] text-text-secondary ml-1 tabular-nums">{task.progress}%</span>
                <button
                  type="button"
                  onClick={() => setShowCompletionDialog(true)}
                  className="p-0.5 rounded text-text-disabled hover:text-accent-400 hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                  title="添加完成笔记"
                >
                  <FileText size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'p-1 rounded transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'text-text-disabled hover:text-danger hover:bg-surface-2',
            )}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Completion dialog */}
      <CompletionDialog
        open={showCompletionDialog}
        taskTitle={task.title}
        onComplete={handleCompletionDialogComplete}
        onClose={() => setShowCompletionDialog(false)}
      />
    </>
  )
}
