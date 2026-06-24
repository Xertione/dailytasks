import { useState, useEffect } from 'react'

export function Clock() {
  const [time, setTime] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date()
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="text-xs text-text-tertiary tabular-nums ml-1">
      {time}
    </span>
  )
}
