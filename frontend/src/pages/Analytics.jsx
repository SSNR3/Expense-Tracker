import { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import api from '../utils/api.js'
import { getCategoryMeta, getPaymentMeta, formatAmount, CURRENCY_SYMBOLS } from '../utils/constants.js'

export default function Analytics({ settings }) {
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = settings?.default_currency || 'INR'
  const sym = CURRENCY_SYMBOLS[currency] || '₹'

  const lineRef = useRef(null)
  const payRef = useRef(null)
  const lineChart = useRef(null)
  const payChart = useRef(null)

  useEffect(() => {
    let isMounted = true
    Promise.all([
      api.analytics.summary().catch(() => null),
      api.analytics.dailySpending().catch(() => [])
    ])
      .then(([s, d]) => {
        if (isMounted) {
          setSummary(s)
          setDaily(Array.isArray(d) ? d : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Line chart with bulletproof cleanup
  useEffect(() => {
    const trend = summary?.monthly_trend || []
    if (!trend.length || !lineRef.current) return

    // Destroy existing instance by ref or canvas ID
    if (lineChart.current) {
      lineChart.current.destroy()
      lineChart.current = null
    }
    const existing = Chart.getChart(lineRef.current)
    if (existing) {
      existing.destroy()
    }

    const data = trend.slice(-12)
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: data.map(t => {
          const parts = (t.month || '').split('-')
          if (parts.length === 2) {
            return new Date(+parts[0], +parts[1] - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
          }
          return t.month || ''
        }),
        datasets: [{
          label: 'Monthly Spend',
          data: data.map(t => t.total),
          borderColor: '#f72585',
          backgroundColor: 'rgba(247, 37, 133, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#f72585',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${sym}${Number(ctx.raw).toLocaleString()}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 }, callback: v => `${sym}${(v/1000).toFixed(0)}K` } },
        }
      }
    })

    return () => {
      if (lineChart.current) {
        lineChart.current.destroy()
        lineChart.current = null
      }
    }
  }, [summary, sym])

  // Payment polar chart with bulletproof cleanup
  useEffect(() => {
    const payments = summary?.payment_breakdown || summary?.by_payment || []
    if (!payments.length || !payRef.current) return

    if (payChart.current) {
      payChart.current.destroy()
      payChart.current = null
    }
    const existing = Chart.getChart(payRef.current)
    if (existing) {
      existing.destroy()
    }

    const colors = ['#f72585', '#b5179e', '#7209b7', '#4361ee', '#4cc9f0', '#ffa41b']
    payChart.current = new Chart(payRef.current, {
      type: 'polarArea',
      data: {
        labels: payments.map(p => p.payment_method),
        datasets: [{
          data: payments.map(p => p.total),
          backgroundColor: colors.map(c => c + 'AA'),
          borderColor: colors,
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 12, boxWidth: 10 } },
          tooltip: { callbacks: { label: ctx => ` ${sym}${Number(ctx.raw).toLocaleString()}` } }
        },
        scales: { r: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { display: false } } }
      }
    })

    return () => {
      if (payChart.current) {
        payChart.current.destroy()
        payChart.current = null
      }
    }
  }, [summary, sym])

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-72 rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  )

  const categories = summary?.category_breakdown || summary?.by_category || []
  const payments = summary?.payment_breakdown || summary?.by_payment || []
  const topCategory = categories[0]
  const totalTx = categories.reduce((s, c) => s + (c.count || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Transactions', value: totalTx, sub: 'this month' },
          { label: 'Highest Category', value: topCategory?.category || '–', sub: topCategory ? formatAmount(topCategory.total, currency) : '' },
          { label: 'Avg Transaction', value: totalTx > 0 ? formatAmount((summary?.total_month || 0) / totalTx, currency) : '–', sub: 'this month' },
          { label: 'Months Tracked', value: summary?.monthly_trend?.length || 0, sub: 'total' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-4">
            <div className="text-white/40 text-xs font-medium">{kpi.label}</div>
            <div className="text-xl font-bold text-white mt-1 font-mono">{kpi.value}</div>
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
            {categories.map(cat => {
              const meta = getCategoryMeta(cat.category)
              const pct = (summary?.total_month || 0) > 0 ? (cat.total / summary.total_month * 100) : 0
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
            {!categories.length && (
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
            {payments.map(p => {
              const meta = getPaymentMeta(p.payment_method)
              const pct = (summary?.total_month || 0) > 0 ? (p.total / summary.total_month * 100).toFixed(0) : 0
              return (
                <div key={p.payment_method} className="flex items-center gap-2 text-xs text-white/50">
                  <span>{meta.icon}</span>
                  <span className="flex-1">{p.payment_method}</span>
                  <span className="font-mono text-white/80">{formatAmount(p.total, currency)}</span>
                  <span className="text-white/30 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
            {!payments.length && (
              <div className="text-white/25 text-sm text-center py-8">No payment records yet</div>
            )}
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
  const validData = Array.isArray(data) ? data : []
  const maxAmount = Math.max(...validData.map(d => d.total), 1)

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    const found = validData.find(d => d.date === dayStr)
    return { day: i + 1, date: dayStr, total: found?.total || 0, future: i + 1 > now.getDate() }
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map(d => {
        const intensity = d.total > 0 ? d.total / maxAmount : 0
        const bg = d.future ? 'rgba(255,255,255,0.03)' : d.total > 0 ? `rgba(247, 37, 133, ${0.2 + intensity * 0.7})` : 'rgba(255,255,255,0.05)'
        return (
          <div
            key={d.day}
            className="relative group w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-110"
            style={{ background: bg, color: d.future ? 'rgba(255,255,255,0.2)' : d.total > 0 ? '#fff' : 'rgba(255,255,255,0.4)' }}
          >
            {d.day}
            {d.total > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-surface-700 border border-white/10 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap shadow-xl">
                  <div className="text-white/40">{d.date}</div>
                  <div className="text-white font-semibold">{sym}{Number(d.total).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
