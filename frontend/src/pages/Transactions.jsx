import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, SortAsc, SortDesc, Download, Pencil, Trash2, Plus, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { sound } from '../components/Effects.jsx'
import { CATEGORIES, PAYMENT_METHODS, getCategoryMeta, getPaymentMeta, formatAmount, formatDate, todayISO } from '../utils/constants.js'
import ExpenseForm from '../components/ExpenseForm.jsx'

const SORT_OPTS = [
  { value: 'date-desc',   label: 'Date (newest)' },
  { value: 'date-asc',    label: 'Date (oldest)' },
  { value: 'amount-desc', label: 'Amount (high→low)' },
  { value: 'amount-asc',  label: 'Amount (low→high)' },
]

export default function Transactions({ settings }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterPay, setFilterPay] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const currency = settings?.default_currency || 'INR'

  const load = useCallback(() => {
    const [sort_by, sort_order] = sort.split('-')
    const params = { sort_by, sort_order, limit: 200 }
    if (search)    params.search = search
    if (filterCat) params.category = filterCat
    if (filterPay) params.payment_method = filterPay
    if (dateFrom)  params.date_from = dateFrom
    if (dateTo)    params.date_to = dateTo
    setLoading(true)
    api.expenses.list(params).then(data => { setExpenses(data); setLoading(false) })
  }, [search, filterCat, filterPay, dateFrom, dateTo, sort])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await api.expenses.delete(id)
    toast.success("Expense deleted 🗑️"); sound.delete('delete')
    setDeleteId(null)
    load()
  }

  const totalFiltered = expenses.reduce((sum, e) => sum + e.amount, 0)
  const hasFilters = search || filterCat || filterPay || dateFrom || dateTo

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="glass-card p-3 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X size={13} /></button>}
        </div>

        {/* Sort */}
        <div className="relative">
          <select className="input-field text-sm pr-8 appearance-none cursor-pointer" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-ghost text-sm ${hasFilters ? 'text-accent border border-accent/30' : ''}`}>
            <Filter size={14} />
            Filters {hasFilters && `(${[filterCat,filterPay,dateFrom,dateTo].filter(Boolean).length})`}
          </button>
          <button onClick={() => api.export.csv()} className="btn-ghost text-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setEditExpense(null); setShowForm(true) }} className="btn-primary text-sm">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="glass-card p-4 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input-field text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input-field text-sm" value={filterPay} onChange={e => setFilterPay(e.target.value)}>
                <option value="">All Methods</option>
                {PAYMENT_METHODS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.id}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input-field text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input-field text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} max={todayISO()} />
            </div>
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterCat(''); setFilterPay(''); setDateFrom(''); setDateTo(''); setSearch('') }} className="mt-3 text-xs text-white/40 hover:text-rose transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-white/40 text-sm">
          {loading ? 'Loading…' : `${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`}
        </span>
        <span className="text-white/70 font-mono text-sm font-semibold">
          Total: {formatAmount(totalFiltered, currency)}
        </span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Header row */}
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-4 text-white/30 text-xs font-medium uppercase tracking-wider">
          <div className="w-9" />
          <div className="flex-1">Description</div>
          <div className="hidden md:block w-32">Category</div>
          <div className="hidden sm:block w-28">Payment</div>
          <div className="hidden sm:block w-24">Date</div>
          <div className="w-28 text-right">Amount</div>
          <div className="w-16" />
        </div>

        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-2 w-1/3 rounded" />
                </div>
                <div className="skeleton h-3 w-20 rounded hidden md:block" />
                <div className="skeleton h-5 w-16 rounded hidden sm:block" />
              </div>
            ))
          : expenses.length === 0
            ? (
              <div className="text-center py-16 text-white/25">
                <div className="text-4xl mb-3">🧾</div>
                <div className="text-sm">No transactions found</div>
                <button onClick={() => setShowForm(true)} className="mt-3 text-accent text-xs hover:underline">Add your first expense</button>
              </div>
            )
            : expenses.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                currency={currency}
                onEdit={() => { setEditExpense(tx); setShowForm(true) }}
                onDelete={() => setDeleteId(tx.id)}
              />
            ))
        }
      </div>

      {/* Export buttons */}
      {expenses.length > 0 && (
        <div className="flex gap-2 justify-end">
          <button onClick={() => api.export.csv()} className="btn-ghost text-xs">Export CSV</button>
          <button onClick={() => api.export.json()} className="btn-ghost text-xs">Export JSON</button>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full animate-slide-up">
            <div className="text-xl mb-1">🗑️</div>
            <div className="text-white font-semibold mb-1">Delete this expense?</div>
            <div className="text-white/40 text-sm mb-5">This action cannot be undone.</div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 btn-ghost justify-center">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-rose/20 hover:bg-rose/30 border border-rose/30 text-rose font-medium py-2 rounded-lg transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ExpenseForm
          expense={editExpense}
          settings={settings}
          onClose={() => { setShowForm(false); setEditExpense(null) }}
          onSaved={() => { setShowForm(false); setEditExpense(null); load() }}
        />
      )}
    </div>
  )
}

function TransactionRow({ tx, currency, onEdit, onDelete }) {
  const meta = getCategoryMeta(tx.category)
  const pay = getPaymentMeta(tx.payment_method)

  return (
    <div className="table-row group border-b border-white/[0.03] last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: meta.bg }}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white/90 text-sm font-medium truncate">{tx.title}</div>
        <div className="text-white/30 text-xs truncate">
          {tx.notes || tx.tags || '\u00A0'}
        </div>
      </div>
      <div className="hidden md:block w-32">
        <span className="chip text-xs" style={{ color: meta.color, borderColor: meta.color + '40', background: meta.bg }}>
          {tx.category}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 w-28">
        <span>{pay.icon}</span>
        <span className="text-white/50 text-xs truncate">{tx.payment_method}</span>
      </div>
      <div className="hidden sm:block w-24 text-white/40 text-xs">{formatDate(tx.date)}</div>
      <div className="w-28 text-right font-mono text-white font-semibold text-sm">
        {formatAmount(tx.amount, tx.currency || currency)}
      </div>
      <div className="flex items-center gap-0.5 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 hover:bg-white/[0.08] rounded-lg text-white/30 hover:text-white transition-all" title="Edit">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-rose/20 rounded-lg text-white/30 hover:text-rose transition-all" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
