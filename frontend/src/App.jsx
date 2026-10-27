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
    return <Login onLoginSuccess="{(u)"> setCurrentUser(u)} />
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
    <div className="min-h-screen applied-canvas flex text-stone-900 relative">
      <ConfettiCanvas active="{showConfetti}" onDone="{()"> setShowConfetti(false)} />
      <PartyPopup onDone="{()" show="{showParty}"> setShowParty(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-64 flex-shrink-0
        bg-white/95 backdrop-blur-xl border-r border-stone-200/80
        flex flex-col z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-stone-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 border border-amber-300 flex items-center justify-center text-stone-950 shadow-sm">
              <TrendingUp size="{20}"/>
            </div>
            <div>
              <div className="font-extrabold text-stone-900 text-base tracking-tight">FinFlow</div>
              <div className="text-stone-400 text-xs">Financial Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest px-3 pb-2 pt-1">Menu</div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { sound.pop(); handleNavigate(id) }}
              className={`nav-item w-full text-left ${page === id ? 'active' : ''}`}
            >
              <Icon size="{16}"/>
              {label}
              {page === id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-200/60 space-y-2">
          <button
            onClick={() => { sound.pop(); setAiOpen(true) }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold
                       bg-amber-400/20 border border-amber-400/40 text-stone-900 hover:bg-amber-400/30 transition-all shadow-sm"
          >
            <Bot className="text-amber-700" size="{16}"/>
            AI Financial Advisor
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <div className="glass-card px-3.5 py-2.5 flex items-center justify-between bg-stone-50/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={`w-2 h-2 rounded-full ${currentUser.role === 'admin' ? 'bg-amber-500' : 'bg-stone-400'}`} />
              <div className="truncate">
                <div className="text-xs font-bold text-stone-900 truncate">{currentUser.username}</div>
                <div className="text-[10px] uppercase tracking-wider text-amber-700 flex items-center gap-1 font-bold">
                  {currentUser.role === 'admin' && <Shield size="{10}"/>}
                  {currentUser.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              <LogOut size="{15}"/>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200/80 px-4 lg:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
              <Menu size="{18}"/>
            </button>
            <div>
              <h1 className="text-stone-900 font-bold text-base leading-none capitalize">
                {page.replace('-', ' ')}
              </h1>
              <p className="text-stone-400 text-xs mt-1">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold">
                <Shield className="text-amber-600" size="{12}"/> Super User Access
              </span>
            )}
            <button onClick={() => { sound.pop(); setAiOpen(true) }} className="btn-ghost text-xs">
              <Bot className="text-amber-600" size="{13}"/> Ask AI
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 page-enter overflow-auto">
          {page === 'dashboard'    && <Dashboard navigate="{handleNavigate}" onExpenseAdded="{handleExpenseAdded}" onParty="{handleParty}" settings="{settings}" summary="{summary}"/>}
          {page === 'transactions' && <Transactions onExpenseAdded="{handleExpenseAdded}" settings="{settings}"/>}
          {page === 'analytics'    && <Analytics settings="{settings}"/>}
          {page === 'budgets'      && <Budgets settings="{settings}"/>}
          {page === 'settings'     && <SettingsPage setSettings="{setSettings}" settings="{settings}"/>}
          {page === 'users' && currentUser.role === 'admin' && <UsersManagement currentUser="{currentUser}" settings="{settings}"/>}
        </main>
      </div>

      <AIAdvisor onClose="{()" open="{aiOpen}"> setAiOpen(false)} settings={settings} />
      <FloatingCharacter onParty="{handleParty}" summary="{summary}"/>
    </div>
  )
}
