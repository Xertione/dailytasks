import { useState } from 'react'
import { Trash2, Check, Star, Clock } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/ipc'
import { useUpdateTask, useUpdateProgress, useDeleteTask } from '@/hooks/useTasks'
import { updateStarRating } from '@/lib/ipc'
import { StarBadge } from './StarBadge'

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const [showStarPicker, setShowStarPicker] = useState(false)
  const updateTask = useUpdateTask()
  const updateProgress = useUpdateProgress()
  const deleteTask = useDeleteTask()

  const isDone = task.status === 'done'
  const deadlinePast = task.due_at && isPast(new Date(task.due_at)) && !isDone
  const deadlineToday = task.due_at && isToday(new Date(task.due_at))

  const handleStatusChange = async () => {
    let nextStatus: string, nextProgress: number
    if (task.status === 'pending') {
      nextStatus = 'in_progress'
      nextProgress = 25
    } else if (task.status === 'in_progress') {
      nextStatus = 'done'
      nextProgress = 100
    } else {
      return // done stays done, don't cycle
    }

    await updateTask.mutateAsync({
      id: task.id,
      title: task.title,
      description: task.description,
      status: nextStatus,
      progress: nextProgress,
      star_value: task.star_value,
      due_at: task.due_at,
      remind_at: task.remind_at,
    })
  }

  const handleProgressChange = async (pct: number) => {
    if (pct >= 100) {
      await updateTask.mutateAsync({
        id: task.id,
        title: task.title,
        description: task.description,
        status: 'done',
        progress: 100,
        star_value: task.star_value,
        due_at: task.due_at,
        remind_at: task.remind_at,
      })
    } else {
      await updateProgress.mutateAsync({ id: task.id, progress: pct })
    }
  }

  const handleStarChange = async (rating: number) => {
    setShowStarPicker(false)
    // When user manually sets the overall star, keep existing dimension scores
    // or set sensible defaults per star level
    const valueScore = task.value_score > 0 ? task.value_score : rating
    const urgency = task.urgency > 0 ? task.urgency : rating
    const potential = task.potential > 0 ? task.potential : rating
    const reason = task.star_reason || '用户手动修正'
    await updateStarRating(task.id, rating, valueScore, urgency, potential, reason)
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id)
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '任务已删除', action: 'undo', taskId: task.id, taskTitle: task.title },
    }))
  }

  return (
    <div
      tabIndex={0}
      data-task-id={task.id}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleStatusChange()
        } else if (e.key === 'Delete') {
          e.preventDefault()
          handleDelete()
        }
      }}
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
          onClick={handleStatusChange}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
            'transition-all duration-200 hover:scale-110',
            task.status === 'pending' && 'border-surface-3 hover:border-accent-400',
            task.status === 'in_progress' && 'border-accent-400 bg-accent-400/20',
            task.status === 'done' && 'border-success bg-success',
          )}
        >
          {task.status === 'done' && (
            <Check size={11} className="text-surface-0" strokeWidth={3} />
          )}
          {task.status === 'in_progress' && (
            <div className={cn(
              'w-2 h-2 rounded-full bg-accent-400',
              'animate-[pulse-glow_2s_ease-in-out_infinite]',
            )} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className={cn(
              'text-sm leading-tight',
              isDone
                ? 'line-through text-text-disabled'
                : 'text-text-primary',
            )}
          >
            {task.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Star badge */}
            <div className="relative">
              <StarBadge
                rating={task.star_value}
                reason={task.star_reason}
                onClick={() => setShowStarPicker(!showStarPicker)}
              />

              {showStarPicker && (
                <div className="absolute top-full left-0 mt-1 bg-surface-1 border border-surface-3 rounded-md p-1.5 z-10 shadow-elevated animate-scale-in">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleStarChange(r)}
                        className="p-1 hover:bg-surface-2 rounded transition-colors duration-150"
                      >
                        <div className="flex gap-0.5">
                          {Array.from({ length: r }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className="fill-accent-400 text-accent-400"
                            />
                          ))}
                        </div>
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
  )
}
