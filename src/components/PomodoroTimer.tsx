import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [
  { label: '工作', mins: 25 },
  { label: '短休', mins: 5 },
  { label: '长休', mins: 15 },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PomodoroTimer() {
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [doneFlash, setDoneFlash] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false)
            setDoneFlash(true)
            setTimeout(() => setDoneFlash(false), 3000)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      stopInterval()
    }
    return stopInterval
  }, [running, remaining, stopInterval])

  const start = () => {
    if (remaining === 0) {
      setRemaining(totalSecs)
    }
    setRunning(true)
  }

  const pause = () => setRunning(false)

  const reset = () => {
    stopInterval()
    setRunning(false)
    setRemaining(totalSecs)
    setDoneFlash(false)
  }

  const setPreset = (mins: number) => {
    stopInterval()
    setTotalSecs(mins * 60)
    setRemaining(mins * 60)
    setRunning(false)
    setDoneFlash(false)
  }

  const percent = totalSecs > 0 ? (remaining / totalSecs) * 100 : 0
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="px-3 py-2 border-t border-surface-3">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 mb-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPreset(p.mins)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
              totalSecs === p.mins * 60
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-text-tertiary hover:bg-surface-2',
            )}
          >
            {p.label} {p.mins}min
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center gap-3">
        {/* SVG circle progress */}
        <div className="relative w-[76px] h-[76px] shrink-0">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 72 72"
          >
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-surface-2"
            />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-[stroke-dashoffset] duration-1000 ease-linear',
                doneFlash ? 'text-danger animate-pulse' : 'text-amber-400',
              )}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                'text-sm font-mono tabular-nums font-medium',
                doneFlash ? 'text-danger' : 'text-amber-400',
              )}
            >
              {formatTime(remaining)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-1">
          {!running ? (
            <button
              type="button"
              onClick={start}
              className="p-1.5 rounded-md bg-amber-500 text-surface-0 hover:bg-amber-400 active:scale-95 transition-all"
            >
              <Play size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="p-1.5 rounded-md bg-surface-2 text-amber-400 hover:bg-surface-3 transition-colors"
            >
              <Pause size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
