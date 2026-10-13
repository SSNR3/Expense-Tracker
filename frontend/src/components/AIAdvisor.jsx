import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import api from '../utils/api.js'
import { sound } from './Effects.jsx'

const QUICK_PROMPTS = [
  "Where did most of my money go this month?",
  "How can I cut 15% next month?",
  "What are my top recurring expenses?",
  "Am I spending more than last month?",
  "Give me 5 concrete savings tips based on my data",
  "Which category should I reduce first?",
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-accent/20 border border-accent/40' : 'bg-surface-500 border border-white/10'
      }`}>
        {isUser ? <User size={13} className="text-accent" /> : <Bot size={13} className="text-white/60" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-accent/20 border border-accent/20 text-white rounded-tr-sm'
          : 'bg-surface-600 border border-white/[0.06] text-white/85 rounded-tl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g)
          return (
            <span key={i}>
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="text-white font-semibold">{part.slice(2,-2)}</strong>
                  : part
              )}
              {i < msg.content.split('\n').length - 1 && <br />}
            </span>
          )
        })}
        {msg.loading && (
          <span className="inline-flex items-center gap-1 ml-1">
            {[0,150,300].map(d => (
              <span key={d} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AIAdvisor({ open, onClose, settings }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // AI is always available with the hardcoded key
  const hasKey = true

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    setError('')
    sound.whoosh()
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', loading: true }])
    setInput('')
    setLoading(true)
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    try {
      const res = await api.ai.chat({ message: text, conversation_history: history })
      sound.pop()
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: res.reply }
      ])
    } catch (err) {
      setMessages(prev => prev.slice(0, -1))
      setError(err.message)
      sound.warning()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-surface-800/95 backdrop-blur-xl border-l border-white/[0.06] z-50 flex flex-col shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-accent relative">
              <Bot size={16} className="text-white" />
              <div className="absolute inset-0 rounded-xl animate-ping bg-accent/30" style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">AI Financial Advisor</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                <span className="text-white/30 text-xs">Powered by Llama 3.1 · Always On</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setError('') }} className="btn-ghost p-2 text-xs" title="Clear chat">
                <RefreshCw size={13} />
              </button>
            )}
            <button onClick={() => { sound.pop(); onClose() }} className="btn-ghost p-2"><X size={15} /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/20 border border-accent/30 flex items-center justify-center mx-auto mb-3 relative">
                  <Sparkles size={24} className="text-accent" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald rounded-full border-2 border-surface-800 animate-pulse" />
                </div>
                <div className="text-white font-semibold mb-1">Your AI Financial Advisor</div>
                <div className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">
                  I have live access to your spending data. Ask me anything about your finances!
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-white/25 text-xs uppercase tracking-wider mb-2">Quick questions</div>
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { sound.pop(); sendMessage(p) }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-white/[0.06] text-white/60 text-xs
                               hover:border-accent/30 hover:bg-accent/5 hover:text-white transition-all float-card"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {error && (
            <div className="bg-rose/10 border border-rose/30 rounded-xl p-3 text-rose text-xs">
              <div className="font-semibold">Error</div>
              <div className="mt-0.5 opacity-80">{error}</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              className="flex-1 px-3 py-2.5 text-sm resize-none min-h-[44px] max-h-32 rounded-xl"
              placeholder="Ask about your finances…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-30
                         flex items-center justify-center transition-all hover:shadow-accent active:scale-95"
            >
              {loading ? <Loader2 size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
            </button>
          </div>
          <div className="text-white/15 text-xs mt-1.5 text-center">Enter to send · Shift+Enter for newline</div>
        </div>
      </div>
    </>
  )
}
