import { useState, useEffect, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowRight, AlertTriangle, Zap, CheckCircle, Info, Plus } from 'lucide-react'
import { Chart, registerables } from 'chart.js'
import api from '../utils/api.js'
import { formatCurrency, formatAmount, calcHealthScore, getCategoryMeta, CURRENCY_SYMBOLS } from '../utils/constants.js'
import ExpenseForm from '../components/ExpenseForm.jsx'
import { BlastCanvas, FloatingAmount, sound } from '../components/Effects.jsx'

Chart.register(...registerables)

function HealthScore({ score }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const strokeDash = (score / 100) * circ
  const color = score >= 75 ? '#10D98A' : score >= 50 ? '#FFAA3B' : '#FF5E7A'
  const label = score >= 75 ? 'Healthy 🟢' : score >= 50 ? 'Moderate 🟡' : 'At Risk 🔴'

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-36 h-36">
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 30px ${color}44` }} />
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${strokeDash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white count-up">{score}</span>
          <span className="text-white/40 text-xs">/ 100</span>
        </div>
      </div>
      <div className="mt-2 text-sm font-medium" style={{ color }}>{label}</div>
      <div className="text-white/30 text-xs mt-0.5">Financial Health Score</div>
    </div>
  )
}

function StatCard({ label, value, sub, trend, trendValue, index }) {
  const isUp = trend === 'up'
  const isDown = trend === 'down'
  return (
    <div
      className="stat-card float-card stat-glow"
      style={{ animationDelay: `${index * 0.3}s` }}
    >
      <div className="text-white/40 text-xs font-medium">{label}</div>
      <div className="text-2xl font-bold text-white mt-1 font-mono count-up">{value}</div>
      {sub && (
        <div className="flex items-center gap-1.5 mt-1">
          {trend === 'up'      && <TrendingUp   size={12} className="text-rose" />}
          {trend === 'down'    && <TrendingDown  size={12} className="text-emerald" />}
          {trend === 'neutral' && <Minus         size={12} className="text-white/30" />}
          <span className={`text-xs ${isUp ? 'text-rose' : isDown ? 'text-emerald' : 'text-white/30'}`}>
            {trendValue}
          </span>
          <span className="text-white/25 text-xs">{sub}</span>
        </div>
      )}
    </div>
  )
}

function InsightCard({ insight, index }) {
  const icons   = { warning: AlertTriangle, tip: Zap, positive: CheckCircle, neutral: Info }
  const colors  = {
    warning:  'text-amber border-amber/30 bg-amber/10',
    tip:      'text-accent border-accent/30 bg-accent/10',
    positive: 'text-emerald border-emerald/30 bg-emerald/10',
    neutral:  'text-white/50 border-white/10 bg-white/5',
  }
  const Icon = icons[insight.type] || Info
  const cls  = colors[insight.type] || colors.neutral
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${cls} float-card`}
      style={{ animation: `slideUp 0.4s ease-out ${index * 0.1}s both` }}
    >
      <Icon size={14} className="mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs font-semibold">{insight.title}</div>
        <div className="text-xs opacity-80 mt-0.5">{insight.message}</div>
      </div>
    </div>
  )
}

export default function Dashboard({ settings, navigate, onExpenseAdded, summary: propSummary, onParty }) {
  const [summary, setSummary] = useState(propSummary || null)
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(!propSummary)
  const [showForm, setShowForm] = useState(false)
  const [blast, setBlast] = useState({ show: false, x: 0, y: 0 })
  const [floatAmounts, setFloatAmounts] = useState([])
  const donutRef = useRef(null)
  const trendRef = useRef(null)
  const donutChart = useRef(null)
  const trendChart = useRef(null)
  const currency = settings?.default_currency || 'INR'
  const sym = CURRENCY_SYMBOLS[currency] || '₹'

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api.analytics.summary(), api.ai.insights()])
      .then(([s, ins]) => { setSummary(s); setInsights(ins.insights || []) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!propSummary) loadData()
    else {
      setSummary(propSummary)
      api.ai.insights().then(ins => setInsights(ins.insights || [])).catch(() => {})
      setLoading(false)
    }
  }, [propSummary])

  // Build donut chart
  useEffect(() => {
    if (!summary || !donutRef.current) return
    if (donutChart.current) donutChart.current.destroy()
    const cats = summary.category_breakdown.slice(0, 8)
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          data: cats.map(c => c.total),
          backgroundColor: cats.map(c => getCategoryMeta(c.category).color + 'BB'),
          borderColor:      cats.map(c => getCategoryMeta(c.category).color),
          borderWidth: 1.5,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        animation: { animateRotate: true, duration: 1200 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${sym}${ctx.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` } }
        }
      }
    })
  }, [summary])

  // Build trend chart
  useEffect(() => {
    if (!summary || !trendRef.current) return
    if (trendChart.current) trendChart.current.destroy()
    const trend = summary.monthly_trend.slice(-6)
    trendChart.current = new Chart(trendRef.current, {
      type: 'bar',
      data: {
        labels: trend.map(t => {
          const [y, m] = t.month.split('-')
          return new Date(+y, +m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        }),
        datasets: [{
          label: 'Monthly Spend',
          data: trend.map(t => t.total),
          backgroundColor: trend.map((_, i) => i === trend.length - 1 ? '#6C63FF' : 'rgba(108,99,255,0.3)'),
          borderColor: 'transparent',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${sym}${ctx.raw.toLocaleString()}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, callback: v => `${sym}${(v/1000).toFixed(0)}K` } },
        }
      }
    })
  }, [summary])

  const score = calcHealthScore(summary)

  const handleExpenseSaved = useCallback((e, amount, cat) => {
    sound.coin()
    // Floating amount
    const rect = document.getElementById('add-btn')?.getBoundingClientRect()
    const x = rect ? rect.left : window.innerWidth / 2
    const y = rect ? rect.top : window.innerHeight / 2
    setFloatAmounts(prev => [...prev, { id: Date.now(), amount, currency, x, y }])
    // Blast
    setBlast({ show: true, x, y })
    setTimeout(() => setBlast(b => ({ ...b, show: false })), 2000)
    setShowForm(false)
    loadData()
    onExpenseAdded?.()
  }, [currency, onExpenseAdded, loadData])

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Blast effect */}
      <BlastCanvas trigger={blast.show} x={blast.x} y={blast.y} onDone={() => setBlast(b => ({ ...b, show: false }))} />

      {/* Floating amount animations */}
      {floatAmounts.map(f => (
        <FloatingAmount key={f.id} amount={f.amount} currency={f.currency} x={f.x} y={f.y}
          onDone={() => setFloatAmounts(prev => prev.filter(p => p.id !== f.id))} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Financial Overview</h2>
          <p className="text-white/40 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · {summary?.days_elapsed} days elapsed
          </p>
        </div>
        <button id="add-btn" onClick={() => { sound.pop(); setShowForm(true) }} className="btn-primary text-sm relative overflow-hidden">
          <Plus size={15} />
          Add Expense
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'This Month',   value: formatCurrency(summary?.total_month, currency),      trend: summary?.mom_change_pct > 0 ? 'up' : 'down', trendValue: `${summary?.mom_change_pct > 0 ? '+' : ''}${summary?.mom_change_pct}%`, sub: 'vs last month' },
          { label: 'This Week',    value: formatCurrency(summary?.total_week, currency),        trend: summary?.wow_change_pct > 0 ? 'up' : 'down', trendValue: `${summary?.wow_change_pct > 0 ? '+' : ''}${summary?.wow_change_pct}%`, sub: 'vs last week' },
          { label: 'Daily Average',value: formatCurrency(summary?.daily_avg, currency),         trend: 'neutral', trendValue: `${summary?.days_elapsed} days`, sub: 'this month' },
          { label: 'Last Month',   value: formatCurrency(summary?.total_last_month, currency),  trend: 'neutral', trendValue: 'reference', sub: 'baseline' },
        ].map((s, i) => <StatCard key={i} index={i} {...s} />)}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Health + Insights */}
        <div className="glass-card p-5 space-y-3 float-card">
          <HealthScore score={score} />
          <div className="divider !my-2" />
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider">AI Insights</div>
          <div className="space-y-2">
            {insights.length > 0
              ? insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)
              : (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">🤖</div>
                  <p className="text-white/25 text-xs">AI is ready — ask it anything!</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Donut chart */}
        <div className="glass-card p-5 float-card">
          <div className="section-title mb-4">Spending by Category</div>
          <div className="h-48 relative">
            <canvas ref={donutRef} />
            {summary?.total_month > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-white/30">Total</div>
                <div className="text-lg font-bold text-white font-mono">{formatCurrency(summary.total_month, currency)}</div>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-1.5">
            {summary?.category_breakdown.slice(0, 5).map(cat => {
              const meta = getCategoryMeta(cat.category)
              const pct = summary.total_month > 0 ? ((cat.total / summary.total_month) * 100).toFixed(0) : 0
              return (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-white/60 text-xs flex-1 truncate">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <span className="text-white/40 text-xs w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="glass-card p-5 float-card">
          <div className="section-title mb-4">Monthly Trend</div>
          <div className="h-48"><canvas ref={trendRef} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-surface-600 rounded-xl p-3">
              <div className="text-white/40 text-xs">Best Month</div>
              <div className="text-white font-semibold text-sm mt-0.5">
                {summary?.monthly_trend.length > 0
                  ? (() => { const best = [...summary.monthly_trend].sort((a,b) => a.total-b.total)[0]; const [y,m] = best.month.split('-'); return new Date(+y,+m-1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) })()
                  : '–'}
              </div>
            </div>
            <div className="bg-surface-600 rounded-xl p-3">
              <div className="text-white/40 text-xs">Avg Monthly</div>
              <div className="text-white font-semibold text-sm mt-0.5 font-mono">
                {summary?.monthly_trend.length > 0
                  ? formatCurrency(summary.monthly_trend.reduce((a,b)=>a+b.total,0)/summary.monthly_trend.length, currency)
                  : '–'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass-card p-5 float-card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Recent Activity</div>
          <button onClick={() => navigate('transactions')} className="btn-ghost text-xs gap-1">
            View all <ArrowRight size={13} />
          </button>
        </div>
        <RecentTransactions currency={currency} />
      </div>

      {showForm && (
        <ExpenseForm
          settings={settings}
          onClose={() => setShowForm(false)}
          onSaved={(expense) => handleExpenseSaved(null, expense?.amount, expense?.category)}
        />
      )}
    </div>
  )
}

function RecentTransactions({ currency }) {
  const [expenses, setExpenses] = useState([])
  useEffect(() => { api.expenses.list({ limit: 8, sort_by: 'date', sort_order: 'desc' }).then(setExpenses) }, [])
  if (!expenses.length) return (
    <div className="text-center py-8 text-white/25 text-sm">
      <div className="text-4xl mb-2">🧾</div>
      No transactions yet. Add your first expense!
    </div>
  )
  return (
    <div className="space-y-0.5">
      {expenses.map(tx => {
        const meta = getCategoryMeta(tx.category)
        return (
          <div key={tx.id} className="table-row group border-b border-white/[0.03] last:border-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: meta.bg }}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/90 text-sm font-medium truncate">{tx.title}</div>
              <div className="text-white/30 text-xs">{tx.category} · {tx.date}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold text-sm font-mono">{formatAmount(tx.amount, tx.currency || currency)}</div>
              <div className="text-white/30 text-xs">{tx.payment_method}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
