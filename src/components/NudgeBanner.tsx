import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { useTodayStats } from '@/hooks/useTasks'

const templates: Record<string, string[]> = {
  gentle: [
    '慢慢来，每一步都算数',
    '今天也是元气满满的一天',
    '不着急，我们按自己的节奏来',
    '你已经很棒了，继续保持',
    '累了就歇歇，任务不会跑',
  ],
  direct: [
    '还有任务没完成，冲！',
    '截止日期在向你招手',
    '别拖了，动起来！',
    '今日事今日毕，加油！',
    '进度条在催你了哦',
  ],
  humorous: [
    '任务：你再不动我就要长蘑菇了',
    '你的待办列表正在看着你',
    '据说完成任务的人会变帅',
    '摸鱼时间到——哦不，工作时间到',
    '再不完成任务就要罚你做100个俯卧撑（不会真做）',
  ],
}

export function NudgeBanner() {
  const [visible, setVisible] = useState(true)
  const [message, setMessage] = useState('')
  const nudgeStyle = useUiStore((s) => s.nudgeStyle)
  const { data: stats } = useTodayStats()

  const pickMessage = useCallback(() => {
    const pool = templates[nudgeStyle] ?? templates.gentle
    return pool[Math.floor(Math.random() * pool.length)]
  }, [nudgeStyle])

  useEffect(() => {
    setMessage(pickMessage())
  }, [pickMessage])

  // Show celebration when all tasks done
  useEffect(() => {
    if (stats && stats.total_cnt > 0 && stats.completed_cnt > 0) {
      const allDone = stats.completed_cnt === stats.total_cnt
      if (allDone) {
        setMessage('太厉害了！所有任务都完成了！')
        setVisible(true)
      }
    }
  }, [stats])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(timer)
  }, [visible, message])

  if (!visible) return null

  return (
    <div
      className={cn(
        'mx-3 mt-2 px-3 py-2 rounded-md text-xs',
        'bg-accent-500/10 border border-accent-500/20',
        'text-accent-200',
        'flex items-center justify-between gap-2',
        'animate-slide-up',
      )}
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="p-0.5 rounded hover:bg-accent-500/20 text-accent-400 transition-colors duration-150 shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  )
}
