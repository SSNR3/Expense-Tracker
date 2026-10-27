import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutDashboard, Receipt, BarChart2, Target, Settings, Bot, Menu, TrendingUp, LogOut, Shield, Users } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Analytics from './pages/Analytics.jsx'
import Budgets from './pages/Budgets.jsx'
import SettingsPage from './pages/Settings.jsx'
import UsersManagement from './pages/UsersManagement.jsx'
import Login from './pages/Login.jsx'
import AIAdvisor from './components/AIAdvisor.jsx'
import { FloatingCharacter } from './components/FinanceCharacter.jsx'
import { ConfettiCanvas, PartyPopup, sound } from './components/Effects.jsx'
import api from './utils/api.js'

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
  const [settings, setSettings] = useState({ default_currency: 'INR', theme: 'light' })
  const [summary, setSummary] = useState(null)
  const [showParty, setShowParty] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevMomRef = useRef(null)

  // Initialize theme from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

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
    api.settings.get().then(s => {
      setSettings(s)
      if (s.theme) {
        if (s.theme === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', s.theme)
      }
    }).catch(() => {})

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

  const navItems = [
    { id: 'dashboard',    label: 'Overview',     icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'analytics',    label: 'Analytics',    icon: BarChart2 },
    { id: 'budgets',      label: 'Budgets',      icon: Target },
    { id: 'settings',     label: 'Settings',     icon: Settings },
  ]

  if (currentUser.role === 'admin') {
    navItems.push({ id: 'users', label: 'Users & Audit', icon: Users })
  }

  return (
    <div className="min-h-screen applied-canvas flex text-stone-900 dark:text-stone-100 relative">
      <ConfettiCanvas active={showConfetti} onDone={() => setShowConfetti(false)} />
      <PartyPopup show={showParty} onDone={() => setShowParty(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-60 flex-shrink-0
        bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800
        flex flex-col z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 border border-amber-300 flex items-center justify-center text-stone-950 shadow-sm">
              <TrendingUp size={16} />
            </div>
            <div>
              <div className="font-extrabold text-stone-900 dark:text-white text-sm tracking-tight">FinFlow</div>
              <div className="text-stone-400 text-[10px]">Operations & Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { sound.pop(); handleNavigate(id) }}
              className={`nav-item w-full text-left ${page === id ? 'active' : ''}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
          <button
            onClick={() => { sound.pop(); setAiOpen(true) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                       bg-amber-400/20 text-stone-900 dark:text-white border border-amber-400/30 hover:bg-amber-400/30 transition-all"
          >
            <Bot size={14} className="text-amber-600" />
            AI Advisor
          </button>

          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-stone-900 dark:text-white truncate">{currentUser.username}</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-600 font-bold flex items-center gap-1">
                {currentUser.role === 'admin' && <Shield size={9} />}
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded-md text-stone-400 hover:text-rose-600 transition-all"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-1.5">
              <Menu size={16} />
            </button>
            <div>
              <h1 className="text-stone-900 dark:text-white font-bold text-sm capitalize">
                {page.replace('-', ' ')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                <Shield size={10} /> Superuser Mode
              </span>
            )}
            <button onClick={() => { sound.pop(); setAiOpen(true) }} className="btn-ghost text-xs">
              <Bot size={12} className="text-amber-500" /> Consult AI
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 page-enter overflow-auto">
          {page === 'dashboard'    && <Dashboard settings={settings} navigate={handleNavigate} onExpenseAdded={handleExpenseAdded} summary={summary} onParty={handleParty} />}
          {page === 'transactions' && <Transactions settings={settings} onExpenseAdded={handleExpenseAdded} />}
          {page === 'analytics'    && <Analytics settings={settings} />}
          {page === 'budgets'      && <Budgets settings={settings} />}
          {page === 'settings'     && <SettingsPage settings={settings} setSettings={setSettings} />}
          {page === 'users' && currentUser.role === 'admin' && <UsersManagement settings={settings} currentUser={currentUser} />}
        </main>
      </div>

      <AIAdvisor open={aiOpen} onClose={() => setAiOpen(false)} settings={settings} />
      <FloatingCharacter summary={summary} onParty={handleParty} />
    </div>
  )
}
