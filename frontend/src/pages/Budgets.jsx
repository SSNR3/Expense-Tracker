import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { CATEGORIES, getCategoryMeta, formatAmount, currentMonth, CURRENCY_SYMBOLS } from '../utils/constants.js'

export default function Budgets({ settings }) {
  const [budgets, setBudgets] = useState([])
  const [bva, setBva] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: CATEGORIES[0].id, monthly_limit: '', month: currentMonth() })
  const currency = settings?.default_currency || 'INR'
  const sym = CURRENCY_SYMBOLS[currency] || '₹'

  const load = () => {
    api.budgets.list().then(setBudgets)
    api.analytics.budgetVsActual().then(setBva)
  }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.monthly_limit || Number(form.monthly_limit) <= 0) return toast.error('Enter a valid budget amount')
    await api.budgets.upsert({ ...form, monthly_limit: Number(form.monthly_limit) })
    toast.success('Budget saved')
    setShowAdd(false)
    setForm({ category: CATEGORIES[0].id, monthly_limit: '', month: currentMonth() })
    load()
  }

  const handleDelete = async (id) => {
    await api.budgets.delete(id)
    toast.success('Budget removed')
    load()
  }

  const totalBudget = bva.reduce((s, b) => s + b.budget, 0)
  const totalActual = bva.reduce((s, b) => s + b.actual, 0)
  const overallPct = totalBudget > 0 ? (totalActual / totalBudget * 100) : 0
  const warningCount = bva.filter(b => b.warning && !b.over_budget).length
  const overCount = bva.filter(b => b.over_budget).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Budget Manager</h2>
          <p className="text-white/40 text-sm mt-0.5">Set monthly spending limits per category</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          <Plus size={14} /> Set Budget
        </button>
      </div>

      {/* Overall summary */}
      {bva.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Monthly Overview</div>
            <div className="flex items-center gap-3">
              {warningCount > 0 && (
                <div className="chip text-amber border-amber/30 bg-amber/10">
                  <AlertTriangle size={10} /> {warningCount} near limit
                </div>
              )}
              {overCount > 0 && (
                <div className="chip text-rose border-rose/30 bg-rose/10">
                  <TrendingUp size={10} /> {overCount} over budget
                </div>
              )}
              {overCount === 0 && warningCount === 0 && (
                <div className="chip text-emerald border-emerald/30 bg-emerald/10">
                  <CheckCircle size={10} /> On track
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-white/40 text-xs">Total Budget</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">{sym}{totalBudget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Spent So Far</div>
              <div className={`text-xl font-bold mt-0.5 font-mono ${overallPct > 100 ? 'text-rose' : overallPct > 80 ? 'text-amber' : 'text-emerald'}`}>
                {sym}{totalActual.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-white/40 text-xs">Remaining</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">
                {sym}{Math.max(0, totalBudget - totalActual).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, overallPct)}%`,
                background: overallPct > 100 ? '#FF5E7A' : overallPct > 80 ? '#FFAA3B' : '#10D98A',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/30">
            <span>{overallPct.toFixed(0)}% used</span>
            <span>{(100 - Math.min(100, overallPct)).toFixed(0)}% remaining</span>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {bva.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-3">
          {bva.map(b => {
            const meta = getCategoryMeta(b.category)
            const budgetData = budgets.find(bd => bd.category === b.category)
            return (
              <BudgetCard
                key={b.category}
                b={b} meta={meta} sym={sym} currency={currency}
                onDelete={budgetData ? () => handleDelete(budgetData.id) : null}
              />
            )
          })}
        </div>
      ) : budgets.length > 0 ? (
        <div className="glass-card p-8 text-center text-white/30 text-sm">
          No spending data for budgeted categories this month.
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <div className="text-white font-medium mb-2">No budgets set yet</div>
          <div className="text-white/40 text-sm mb-5">Set monthly limits to track your spending against goals.</div>
          <button onClick={() => setShowAdd(true)} className="btn-primary mx-auto">
            <Plus size={14} /> Create First Budget
          </button>
        </div>
      )}

      {/* Untracked budgets (set but no spending yet) */}
      {budgets.filter(b => !bva.find(bv => bv.category === b.category)).length > 0 && (
        <div className="glass-card p-5">
          <div className="text-white/40 text-sm font-medium mb-3">Budgets with no spending yet</div>
          <div className="space-y-2">
            {budgets.filter(b => !bva.find(bv => bv.category === b.category)).map(b => {
              const meta = getCategoryMeta(b.category)
              return (
                <div key={b.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="text-white/70 text-sm flex-1">{b.category}</span>
                  <span className="text-white/40 text-xs font-mono">{sym}{b.monthly_limit.toLocaleString()} / mo</span>
                  <button onClick={() => handleDelete(b.id)} className="btn-danger p-1.5"><Trash2 size={13} /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add budget modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full animate-slide-up">
            <div className="section-title mb-4">Set Category Budget</div>
            <div className="space-y-3">
              <div>
                <label className="label">Category</label>
                <select className="input-field text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monthly Limit ({sym})</label>
                <input type="number" className="input-field text-sm" placeholder="e.g. 5000" value={form.monthly_limit} onChange={e => setForm({...form, monthly_limit: e.target.value})} min="1" />
              </div>
              <div>
                <label className="label">Month</label>
                <input type="month" className="input-field text-sm" value={form.month} onChange={e => setForm({...form, month: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 btn-ghost justify-center">Cancel</button>
              <button onClick={handleSave} className="flex-1 btn-primary justify-center">Save Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BudgetCard({ b, meta, sym, currency, onDelete }) {
  const remaining = b.budget - b.actual
  const barColor = b.over_budget ? '#FF5E7A' : b.warning ? '#FFAA3B' : '#10D98A'

  return (
    <div className={`glass-card p-4 border ${b.over_budget ? 'border-rose/25' : b.warning ? 'border-amber/25' : 'border-white/[0.06]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: meta.bg }}>
            {meta.icon}
          </div>
          <div>
            <div className="text-white/90 text-sm font-medium">{b.category}</div>
            <div className="text-white/30 text-xs mt-0.5 font-mono">Budget: {sym}{b.budget.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {b.over_budget && <AlertTriangle size={14} className="text-rose" />}
          {b.warning && !b.over_budget && <AlertTriangle size={14} className="text-amber" />}
          {!b.warning && <CheckCircle size={14} className="text-emerald" />}
          {onDelete && <button onClick={onDelete} className="btn-danger p-1"><Trash2 size={12} /></button>}
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-xs text-white/30">Spent</div>
          <div className={`text-lg font-bold font-mono ${b.over_budget ? 'text-rose' : b.warning ? 'text-amber' : 'text-white'}`}>
            {sym}{b.actual.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/30">{b.over_budget ? 'Over by' : 'Remaining'}</div>
          <div className={`text-sm font-semibold font-mono ${b.over_budget ? 'text-rose' : 'text-emerald'}`}>
            {b.over_budget ? `+${sym}${Math.abs(remaining).toLocaleString()}` : `${sym}${remaining.toLocaleString()}`}
          </div>
        </div>
      </div>

      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, b.pct)}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-white/25">
        <span>{b.pct}% used</span>
        {b.warning && !b.over_budget && <span className="text-amber">⚠ Near limit</span>}
        {b.over_budget && <span className="text-rose">Over budget!</span>}
      </div>
    </div>
  )
}
