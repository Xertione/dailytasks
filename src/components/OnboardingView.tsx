import { useState } from 'react'
import { ClipboardPaste, Sparkles } from 'lucide-react'
import { saveApiKey } from '@/lib/ipc'

interface OnboardingViewProps {
  onComplete: () => void
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setApiKey(text.trim())
      setError('')
    } catch {
      // ignore - clipboard read may fail
    }
  }

  const handleSubmit = async () => {
    if (!apiKey.trim()) return
    setLoading(true)
    setError('')
    try {
      await saveApiKey(apiKey.trim())
      onComplete()
    } catch (e) {
      setError('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-surface-0 px-6">
      {/* Icon */}
      <div className="mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
        <Sparkles size={28} className="text-white" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-text-primary mb-2">
        欢迎使用 每日任务 ✨
      </h1>

      {/* Subtitle */}
      <p className="text-sm text-text-secondary mb-8 text-center max-w-xs">
        请输入你的 DeepSeek API Key 开始使用
      </p>

      {/* Input area */}
      <div className="w-full max-w-xs space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
              autoFocus
            />
          </div>
          <button
            onClick={handlePaste}
            className="shrink-0 px-3 py-2.5 rounded-lg bg-surface-2 border border-surface-3 text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors"
            title="从剪贴板粘贴"
          >
            <ClipboardPaste size={16} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!apiKey.trim() || loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
            enabled:bg-accent-500 enabled:text-white enabled:hover:bg-accent-400 enabled:active:scale-[0.98]
            disabled:bg-surface-2 disabled:text-text-disabled disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '开始使用'}
        </button>

        {/* Help link */}
        <p className="text-center">
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-400 hover:text-accent-300 underline underline-offset-2 transition-colors"
          >
            如何获取 API Key？
          </a>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-10 text-[11px] text-text-disabled text-center">
        你的 Key 仅保存在本地，不会上传
      </p>
    </div>
  )
}
