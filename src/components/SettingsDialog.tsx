import { useState } from 'react'
import { X, RefreshCw, CheckCircle, XCircle, AlertTriangle, ClipboardPaste, Save, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore, type NudgeStyle } from '@/stores/uiStore'
import { useTasks, useTodayStats } from '@/hooks/useTasks'
import { getAiStatus, saveApiKey, type AiStatus } from '@/lib/ipc'
import { useQuery } from '@tanstack/react-query'

const nudgeOptions: { value: NudgeStyle; label: string; desc: string }[] = [
  { value: 'gentle', label: '温和', desc: '轻柔鼓励，适合压力大的时候' },
  { value: 'direct', label: '直接', desc: '直截了当，高效推动' },
  { value: 'humorous', label: '幽默', desc: '轻松调侃，缓解焦虑' },
]

export function SettingsDialog() {
  const {
    isSettingsOpen,
    closeSettings,
    nudgeStyle,
    setNudgeStyle,
  } = useUiStore()

  const { data: tasks } = useTasks()
  const { data: stats } = useTodayStats()
  const { data: aiStatus, isLoading: aiStatusLoading, refetch: refetchAiStatus } = useQuery<AiStatus>({
    queryKey: ['aiStatus'],
    queryFn: getAiStatus,
    enabled: isSettingsOpen,
    staleTime: 30_000,
  })

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!isSettingsOpen) return null

  const totalTasks = stats?.total_cnt ?? (tasks?.length ?? 0)
  const completedTasks = stats?.completed_cnt ?? (tasks?.filter(t => t.status === 'done').length ?? 0)
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setApiKeyInput(text.trim())
      setSaveMsg(null)
    } catch {
      // ignore
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await saveApiKey(apiKeyInput.trim())
      setSaveMsg({ ok: true, text: 'API Key 已保存' })
      setApiKeyInput('')
      refetchAiStatus()
    } catch {
      setSaveMsg({ ok: false, text: '保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Dialog */}
      <div className="relative bg-surface-1 border border-surface-3 rounded-xl w-[340px] max-h-[80%] overflow-y-auto shadow-modal animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
          <h2 className="text-sm font-medium text-text-primary">设置</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Nudge style */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              鼓励话术风格
            </label>
            <div className="space-y-1.5">
              {nudgeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNudgeStyle(option.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150',
                    nudgeStyle === option.value
                      ? 'bg-accent-500/10 border border-accent-500/30 text-accent-200'
                      : 'bg-surface-2 border border-transparent text-text-secondary hover:bg-surface-2/80',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="block text-[11px] text-text-tertiary mt-0.5">
                    {option.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shortcut info */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              全局快捷键
            </label>
            <div className="space-y-1.5 text-[11px] text-text-tertiary">
              <div className="flex justify-between items-center">
                <span>显示/隐藏窗口</span>
                <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-text-secondary text-[10px] font-mono shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">
                  Ctrl+Shift+T
                </kbd>
              </div>
            </div>
          </div>

          {/* API Key — 像修改密码一样随时修改 */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              API Key
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value)
                    setSaveMsg(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveApiKey()
                  }}
                  placeholder={aiStatus?.key_preview || '输入新的 API Key'}
                  className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                />
                <button
                  onClick={handlePaste}
                  className="shrink-0 px-3 py-2 rounded-lg bg-surface-2 border border-surface-3 text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors"
                  title="从剪贴板粘贴"
                >
                  <ClipboardPaste size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim() || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    enabled:bg-accent-500 enabled:text-white enabled:hover:bg-accent-400 enabled:active:scale-[0.98]
                    disabled:bg-surface-2 disabled:text-text-disabled disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {saving ? '保存中...' : '修改 Key'}
                </button>
                {saveMsg && (
                  <span className={cn(
                    'text-xs flex items-center gap-1',
                    saveMsg.ok ? 'text-success' : 'text-danger',
                  )}>
                    {saveMsg.ok ? <Check size={12} /> : <X size={12} />}
                    {saveMsg.text}
                  </span>
                )}
              </div>
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11px] text-accent-400 hover:text-accent-300 underline underline-offset-2 transition-colors"
              >
                获取 DeepSeek API Key →
              </a>
            </div>
          </div>

          {/* AI Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">
                AI 连接状态
              </label>
              <button
                type="button"
                onClick={() => refetchAiStatus()}
                disabled={aiStatusLoading}
                className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                <RefreshCw size={12} className={cn(aiStatusLoading && 'animate-spin')} />
              </button>
            </div>
            {aiStatus ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {aiStatus.status === 'ready' && aiStatus.api_test === 'ok' ? (
                    <CheckCircle size={14} className="text-success" />
                  ) : aiStatus.status === 'error' ? (
                    <XCircle size={14} className="text-danger" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-400" />
                  )}
                  <span className={cn(
                    'font-medium',
                    aiStatus.status === 'ready' && aiStatus.api_test === 'ok' ? 'text-success' :
                    aiStatus.status === 'error' ? 'text-danger' : 'text-amber-400'
                  )}>
                    {aiStatus.status === 'ready' && aiStatus.api_test === 'ok' ? '已连接' :
                     aiStatus.status === 'error' ? '连接异常' : '离线'}
                  </span>
                </div>
                <div className="bg-surface-2 rounded-md p-2.5 space-y-1 text-text-tertiary">
                  <div className="flex justify-between">
                    <span>Key</span>
                    <span className="text-text-secondary font-mono">{aiStatus.key_preview}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>模型</span>
                    <span className="text-text-secondary">{aiStatus.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>端点</span>
                    <span className="text-text-secondary truncate max-w-[180px]">{aiStatus.base_url}</span>
                  </div>
                  {aiStatus.api_test_msg && (
                    <div className={cn(
                      'mt-2 pt-2 border-t border-surface-3',
                      aiStatus.api_test === 'ok' ? 'text-success' : 'text-danger'
                    )}>
                      {aiStatus.api_test_msg}
                    </div>
                  )}
                </div>
              </div>
            ) : aiStatusLoading ? (
              <div className="text-[11px] text-text-tertiary animate-pulse">检测中...</div>
            ) : (
              <div className="text-[11px] text-text-disabled">无法获取状态</div>
            )}
          </div>

          {/* Data statistics */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              数据统计
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-2 rounded-md p-3 text-center">
                <div className="text-2xl font-semibold text-text-primary tabular-nums">
                  {totalTasks}
                </div>
                <div className="text-[10px] text-text-tertiary mt-0.5">总任务数</div>
              </div>
              <div className="bg-surface-2 rounded-md p-3 text-center">
                <div className="text-2xl font-semibold text-text-primary tabular-nums">
                  {completionRate}%
                </div>
                <div className="text-[10px] text-text-tertiary mt-0.5">完成率</div>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="text-center text-[10px] text-text-disabled pt-1">
            每日任务 v0.1.0
          </div>
        </div>
      </div>
    </div>
  )
}
