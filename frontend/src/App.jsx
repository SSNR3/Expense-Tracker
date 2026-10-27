import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutDashboard, Receipt, BarChart2, Target, Settings, Bot, Menu, TrendingUp, LogOut, Shield } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Analytics from './pages/Analytics.jsx'
import Budgets from './pages/Budgets.jsx'
import SettingsPage from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [settings, setSettings] = useState({ default_currency: 'INR' })
  const [summary, setSummary] = useState(null)
  const [showParty, setShowParty] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevMomRef = useRef(null)

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
  }, [])

  useEffect(() => {
    const onAuthLogout = () => setCurrentUser(null)
    window.addEventListener('auth-logout', onAuthLogout)
    return () => window.removeEventListener('auth-logout', onAuthLogout)
  }, [])

  useEffect(() => {
    if (!currentUser) return
    api.settings.get().then(s => setSettings(s)).catch(() => {})
    api.analytics.summary().then(s => {
      setSummary(s)
      if (s.mom_change_pct < -10 && s.total_month > 0) {
        setTimeout(() => { setShowParty(true); setShowConfetti(true) }, 800)
      }
      prevMomRef.current = s.mom_change_pct
    }).catch(() => {})
  }, [currentUser])

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
    api.analytics.summary().then(s => {
      setSummary(s)
      prevMomRef.current = s.mom_change_pct
    }).catch(() => {})
  }, [])

  if (!currentUser) {
    return <Login onLoginSuccess={(u) => setCurrentUser(u)} />
  }

  return (
    <div className="min-h-screen charcoal-bg flex text-white relative">
      <ConfettiCanvas active={showConfetti} onDone={() => setShowConfetti(false)} />
      <PartyPopup show={showParty} onDone={() => setShowParty(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-64 flex-shrink-0
        bg-surface-800/95 backdrop-blur-2xl border-r border-white/[0.08]
        flex flex-col z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-neonPink via-indigoBloom to-electricSapphire flex items-center justify-center shadow-neon relative">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-tight shimmer-text">FinFlow</div>
              <div className="text-white/40 text-xs">Financial Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 pb-2 pt-1">Navigation</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { sound.pop(); handleNavigate(id) }}
              className={`nav-item w-full text-left ${page === id ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {page === id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-neonPink animate-ping" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.08] space-y-2">
          <button
            onClick={() => { sound.pop(); setAiOpen(true) }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold
                       bg-gradient-to-r from-neonPink/20 via-indigoBloom/20 to-electricSapphire/20 border border-neonPink/40
                       text-neonPink hover:border-neonPink transition-all shadow-sm"
          >
            <Bot size={16} />
            AI Financial Advisor
            <div className="ml-auto w-2 h-2 rounded-full bg-skyAqua animate-pulse" />
          </button>

          <div className="glass-card px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-neonPink animate-pulse' : 'bg-electricSapphire'}`} />
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{currentUser.username}</div>
                <div className="text-[10px] uppercase tracking-wider text-skyAqua flex items-center gap-1 font-semibold">
                  {currentUser.role === 'admin' && <Shield size={10} />}
                  {currentUser.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-white/40 hover:text-rose hover:bg-rose/10 transition-all"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-charcoal-900/80 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-white font-bold text-base leading-none">
                {NAV.find(n => n.id === page)?.label}
              </h1>
              <p className="text-white/30 text-xs mt-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neonPink/15 border border-neonPink/40 text-neonPink text-xs font-semibold">
                <Shield size={12} /> Super User Full Control
              </span>
            )}
            <button
              onClick={() => { sound.pop(); setAiOpen(true) }}
              className="btn-ghost text-xs"
            >
              <Bot size={13} className="text-skyAqua" />
              Ask AI
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 page-enter overflow-auto">
          {page === 'dashboard'    && <Dashboard   settings={settings} navigate={handleNavigate} onExpenseAdded={handleExpenseAdded} summary={summary} onParty={handleParty} />}
          {page === 'transactions' && <Transactions settings={settings} onExpenseAdded={handleExpenseAdded} />}
          {page === 'analytics'    && <Analytics    settings={settings} />}
          {page === 'budgets'      && <Budgets      settings={settings} />}
          {page === 'settings'     && <SettingsPage settings={settings} setSettings={setSettings} />}
        </main>
      </div>

      <AIAdvisor open={aiOpen} onClose={() => setAiOpen(false)} settings={settings} />
      <FloatingCharacter summary={summary} onParty={handleParty} />
    </div>
  )
}
