import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutDashboard, Receipt, BarChart2, Target, Settings, Bot, Menu, TrendingUp } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Analytics from './pages/Analytics.jsx'
import Budgets from './pages/Budgets.jsx'
import SettingsPage from './pages/Settings.jsx'
import AIAdvisor from './components/AIAdvisor.jsx'
import { FloatingCharacter } from './components/FinanceCharacter.jsx'
import { ConfettiCanvas, PartyPopup, sound } from './components/Effects.jsx'
import api from './utils/api.js'

const NAV = [
  { id: 'dashboard',    label: 'Overview',     icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'analytics',    label: 'Analytics',    icon: BarChart2 },
  { id: 'budgets',      label: 'Budgets',      icon: Target },
  { id: 'settings',     label: 'Settings',     icon: Settings },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [settings, setSettings] = useState({ default_currency: 'INR' })
  const [summary, setSummary] = useState(null)
  const [showParty, setShowParty] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevMomRef = useRef(null)

  useEffect(() => {
    api.settings.get().then(s => setSettings(s)).catch(() => {})
    api.analytics.summary().then(s => {
      setSummary(s)
      // First load — detect celebrating mood
      if (s.mom_change_pct < -10 && s.total_month > 0) {
        setTimeout(() => { setShowParty(true); setShowConfetti(true) }, 800)
      }
      prevMomRef.current = s.mom_change_pct
    }).catch(() => {})
  }, [])

  // Refresh summary when navigating back to dashboard
  const handleNavigate = useCallback((p) => {
    setPage(p)
    setSidebarOpen(false)
    if (p === 'dashboard') {
      api.analytics.summary().then(setSummary).catch(() => {})
    }
  }, [])

  const handleParty = useCallback(() => {
    setShowParty(true)
    setShowConfetti(true)
    sound.party()
  }, [])

  const handleExpenseAdded = useCallback(() => {
    // Refresh summary after adding expense
    api.analytics.summary().then(s => {
      setSummary(s)
      prevMomRef.current = s.mom_change_pct
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Confetti canvas */}
      <ConfettiCanvas active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Party popup */}
      <PartyPopup show={showParty} onDone={() => setShowParty(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-64 flex-shrink-0
        bg-surface-800/90 backdrop-blur-xl border-r border-white/[0.06]
        flex flex-col z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-accent relative">
              <TrendingUp size={18} className="text-white" />
              <div className="absolute inset-0 rounded-xl animate-ping bg-accent/20" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight">FinFlow</div>
              <div className="text-white/30 text-xs">Financial Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
          <div className="text-white/20 text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 pt-1">Navigation</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { sound.pop(); handleNavigate(id) }}
              className={`nav-item w-full text-left ${page === id ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {page === id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => { sound.pop(); setAiOpen(true) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       bg-gradient-to-r from-accent/20 to-purple-600/20 border border-accent/30
                       text-accent hover:from-accent/30 hover:to-purple-600/30 transition-all duration-200 relative overflow-hidden"
          >
            <Bot size={16} />
            AI Financial Advisor
            <div className="absolute right-3 w-2 h-2 rounded-full bg-emerald animate-pulse" />
          </button>
        </div>

        <div className="p-3 pt-0">
          <div className="glass-card px-3 py-2 flex items-center justify-between">
            <span className="text-white/30 text-xs">Default Currency</span>
            <span className="text-white/70 text-xs font-mono font-medium">{settings.default_currency || 'INR'}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-surface-900/80 backdrop-blur-xl border-b border-white/[0.06] px-4 lg:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-white font-semibold text-base leading-none">
                {NAV.find(n => n.id === page)?.label}
              </h1>
              <p className="text-white/30 text-xs mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => { sound.pop(); setAiOpen(true) }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition-all"
          >
            <Bot size={13} />
            Ask AI
            <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 page-enter overflow-auto">
          {page === 'dashboard'    && <Dashboard   settings={settings} navigate={handleNavigate} onExpenseAdded={handleExpenseAdded} summary={summary} onParty={handleParty} />}
          {page === 'transactions' && <Transactions settings={settings} onExpenseAdded={handleExpenseAdded} />}
          {page === 'analytics'    && <Analytics    settings={settings} />}
          {page === 'budgets'      && <Budgets      settings={settings} />}
          {page === 'settings'     && <SettingsPage settings={settings} setSettings={setSettings} />}
        </main>
      </div>

      {/* Floating AI panel */}
      <AIAdvisor open={aiOpen} onClose={() => setAiOpen(false)} settings={settings} />

      {/* Floating mascot character */}
      <FloatingCharacter summary={summary} onParty={handleParty} />
    </div>
  )
}
