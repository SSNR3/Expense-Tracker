import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { CATEGORIES, PAYMENT_METHODS, CURRENCIES, getCategoryMeta, todayISO } from '../utils/constants.js'
import { sound } from './Effects.jsx'

const EMPTY = {
  date: todayISO(), title: '', amount: '', currency: 'INR',
  category: 'Food & Dining', payment_method: 'UPI', notes: '', tags: '',
}

export default function ExpenseForm({ expense, settings, onClose, onSaved }) {
  const [form, setForm] = useState(
    expense ? { ...expense, amount: String(expense.amount) }
            : { ...EMPTY, currency: settings?.default_currency || 'INR' }
  )
  const [saving, setSaving] = useState(false)
  const isEdit = !!expense
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return toast.error('Enter a valid amount')
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      if (isEdit) {
        await api.expenses.update(expense.id, payload)
        toast.success('Expense updated ✏️')
        sound.pop()
        onSaved?.(payload)
      } else {
        await api.expenses.create(payload)
        toast.success('Expense added 💸')
        sound.coin()
        onSaved?.(payload)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const meta = getCategoryMeta(form.category)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="glass-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-300"
              style={{ background: meta.bg, border: `2px solid ${meta.color}44` }}
            >
              {meta.icon}
            </div>
            <div>
              <div className="text-white font-semibold">{isEdit ? 'Edit Expense' : 'Add Expense'}</div>
              <div className="text-white/30 text-xs">{form.category}</div>
            </div>
          </div>
          <button onClick={() => { sound.pop(); onClose() }} className="btn-ghost p-2"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="label">Description *</label>
            <input className="input-field text-sm" placeholder="e.g. Lunch at Meghana Foods" value={form.title} onChange={set('title')} required />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="label">Amount *</label>
              <input type="number" className="input-field text-sm font-mono" placeholder="0.00" value={form.amount} onChange={set('amount')} min="0.01" step="0.01" required />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input-field text-sm" value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Date *</label>
            <input type="date" className="input-field text-sm" value={form.date} onChange={set('date')} max={todayISO()} required />
          </div>

          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => { setForm(f => ({ ...f, category: cat.id })); sound.pop() }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border text-left transition-all"
                  style={form.category === cat.id
                    ? { borderColor: cat.color + '80', background: cat.bg, color: '#fff', transform: 'scale(1.02)' }
                    : { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Payment Method</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id} type="button"
                  onClick={() => { setForm(f => ({ ...f, payment_method: pm.id })); sound.pop() }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={form.payment_method === pm.id
                    ? { borderColor: 'rgba(108,99,255,0.6)', background: 'rgba(108,99,255,0.15)', color: '#6C63FF', transform: 'scale(1.05)' }
                    : { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {pm.icon} {pm.id}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Notes</label>
              <input className="input-field text-sm" placeholder="Optional" value={form.notes || ''} onChange={set('notes')} />
            </div>
            <div>
              <label className="label">Tags</label>
              <input className="input-field text-sm" placeholder="work, urgent" value={form.tags || ''} onChange={set('tags')} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { sound.pop(); onClose() }} className="flex-1 btn-ghost justify-center py-2.5">Cancel</button>
            <button
              type="submit" disabled={saving}
              className="flex-1 btn-primary justify-center py-2.5 relative overflow-hidden"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Saving…' : isEdit ? 'Update' : '💸 Add Expense'}
              {!saving && <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
