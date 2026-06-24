import { PomodoroTimer } from '@/components/PomodoroTimer'

export function PomodoroView() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
      <PomodoroTimer />
      <p className="text-xs text-text-tertiary text-center max-w-[240px]">
        使用番茄钟技巧，工作 25 分钟后休息 5 分钟，保持高效专注
      </p>
    </div>
  )
}
