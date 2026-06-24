import { useTasks } from '@/hooks/useTasks'
import { TaskInput } from '@/components/TaskInput'
import { TaskList } from '@/components/TaskList'
import { ProgressPanel } from '@/components/ProgressPanel'

export function TaskView() {
  const { data: tasks, isLoading } = useTasks()

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 border-b border-surface-3/50">
        <TaskInput />
      </div>
      <TaskList tasks={tasks ?? []} isLoading={isLoading} />
      <div className="shrink-0" id="progress-panel">
        <ProgressPanel />
      </div>
    </div>
  )
}
