import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import api from '../utils/api.js'
import { getCategoryMeta, getPaymentMeta, formatAmount, CURRENCY_SYMBOLS } from '../utils/constants.js'

Chart.register(...registerables)

export default function Analytics({ settings }) {
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = settings?.default_currency || 'INR'
  const sym = CURRENCY_SYMBOLS[currency] || '₹'

  const lineRef = useRef(null)
  const payRef = useRef(null)
  const heatRef = useRef(null)
  const lineChart = useRef(null)
  const payChart = useRef(null)

  useEffect(() => {
    Promise.all([api.analytics.summary(), api.analytics.dailySpending()])
      .then(([s, d]) => { setSummary(s); setDaily(d) })
      .finally(() => setLoading(false))
  }, [])

  // Monthly line chart
  useEffect(() => {
    if (!summary?.monthly_trend || !lineRef.current) return
    if (lineChart.current) lineChart.current.destroy()
    const data = summary.monthly_trend.slice(-12)
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: data.map(t => {
          const [y, m] = t.month.split('-')
          return new Date(+y, +m-1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        }),
        datasets: [{
          label: 'Monthly Spend',
          data: data.map(t => t.total),
          borderColor: '#6C63FF',
          backgroundColor: 'rgba(108,99,255,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#6C63FF',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${ctx.raw.toLocaleString()}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 11 }, callback: v => `${sym}${(v/1000).toFixed(0)}K` } },
        }
      }
    })
  }, [summary])

  // Payment method polar chart
  useEffect(() => {
    if (!summary?.payment_breakdown || !payRef.current) return
    if (payChart.current) payChart.current.destroy()
    const data = summary.payment_breakdown
    const colors = ['#6C63FF', '#FF5E7A', '#38BDF8', '#10D98A', '#FFAA3B', '#A78BFA']
    payChart.current = new Chart(payRef.current, {
      type: 'polarArea',
      data: {
        labels: data.map(p => p.payment_method),
        datasets: [{
          data: data.map(p => p.total),
          backgroundColor: colors.map(c => c + 'AA'),
          borderColor: colors,
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, padding: 12, boxWidth: 10 } },
          tooltip: { callbacks: { label: ctx => ` ${sym}${ctx.raw.toLocaleString()}` } }
        },
        scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } }
      }
    })
  }, [summary])

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
    </div>
  )

  const topCategory = summary?.category_breakdown?.[0]
  const totalTx = summary?.category_breakdown?.reduce((s, c) => s + c.count, 0) || 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Transactions', value: totalTx, sub: 'this month' },
          { label: 'Highest Category', value: topCategory?.category || '–', sub: topCategory ? formatAmount(topCategory.total, currency) : '' },
          { label: 'Avg Transaction', value: totalTx > 0 ? formatAmount(summary.total_month / totalTx, currency) : '–', sub: 'this month' },
          { label: 'Months Tracked', value: summary?.monthly_trend?.length || 0, sub: 'total' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-4">
            <div className="text-white/40 text-xs font-medium">{kpi.label}</div>
            <div className="text-xl font-bold text-white mt-1">{kpi.value}</div>
            <div className="text-white/30 text-xs mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Spending trend line */}
      <div className="glass-card p-5">
        <div className="section-title mb-1">12-Month Spending Trend</div>
        <div className="text-white/30 text-sm mb-4">Monthly total expenditure over time</div>
        <div className="h-64">
          <canvas ref={lineRef} />
        </div>
      </div>

      {/* Category deep dive + payment methods */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="section-title mb-4">Category Deep Dive</div>
          <div className="space-y-3">
            {summary?.category_breakdown.map(cat => {
              const meta = getCategoryMeta(cat.category)
              const pct = summary.total_month > 0 ? (cat.total / summary.total_month * 100) : 0
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-white/80 text-sm">{cat.category}</span>
                      <span className="text-white/30 text-xs">×{cat.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">{pct.toFixed(1)}%</span>
                      <span className="text-white font-medium text-sm font-mono">{formatAmount(cat.total, currency)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                    />
                  </div>
                </div>
              )
            })}
            {!summary?.category_breakdown?.length && (
              <div className="text-white/25 text-sm text-center py-8">No spending data yet</div>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="section-title mb-1">Payment Method Split</div>
          <div className="text-white/30 text-sm mb-4">How you prefer to pay</div>
          <div className="h-56">
            <canvas ref={payRef} />
          </div>
          <div className="mt-3 space-y-1.5">
            {summary?.payment_breakdown.map(p => {
              const meta = getPaymentMeta(p.payment_method)
              const pct = summary.total_month > 0 ? (p.total / summary.total_month * 100).toFixed(0) : 0
              return (
                <div key={p.payment_method} className="flex items-center gap-2 text-xs text-white/50">
                  <span>{meta.icon}</span>
                  <span className="flex-1">{p.payment_method}</span>
                  <span className="font-mono">{formatAmount(p.total, currency)}</span>
                  <span className="text-white/25 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Daily spending heatmap */}
      <div className="glass-card p-5">
        <div className="section-title mb-1">Daily Spending This Month</div>
        <div className="text-white/30 text-sm mb-4">Spending pattern by day</div>
        <DailyHeatmap data={daily} currency={currency} sym={sym} />
      </div>
    </div>
  )
}

function DailyHeatmap({ data, currency, sym }) {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const maxAmount = Math.max(...data.map(d => d.total), 1)

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    const found = data.find(d => d.date === dayStr)
    return { day: i + 1, date: dayStr, total: found?.total || 0, future: i + 1 > now.getDate() }
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map(d => {
        const intensity = d.total > 0 ? d.total / maxAmount : 0
        const bg = d.future ? 'rgba(255,255,255,0.03)' : d.total > 0 ? `rgba(108,99,255,${0.15 + intensity * 0.7})` : 'rgba(255,255,255,0.05)'
        return (
          <div
            key={d.day}
            className="relative group w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-110"
            style={{ background: bg, color: d.future ? 'rgba(255,255,255,0.15)' : d.total > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
          >
            {d.day}
            {d.total > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-surface-600 border border-white/10 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-xl">
                  <div className="text-white/50">{d.date}</div>
                  <div className="text-white font-semibold">{sym}{d.total.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
