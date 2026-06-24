import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { chatWithAi, type ChatMessage } from '@/lib/ipc'

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '...' }])
    setLoading(true)

    try {
      const reply = await chatWithAi(text, messages)
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `抱歉，出错了：${errorMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-surface-3">
        <h2 className="text-sm font-semibold text-text-primary">AI 教练</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            和 AI 教练聊聊你的任务进展吧
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-accent-500 text-white'
                    : 'bg-surface-2 text-text-primary'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-surface-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="聊聊你的任务和心情..."
            disabled={loading}
            className="flex-1 h-9 px-3 rounded-lg bg-surface-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-accent-500 text-white disabled:opacity-50 hover:bg-accent-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
