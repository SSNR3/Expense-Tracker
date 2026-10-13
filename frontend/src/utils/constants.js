export const CATEGORIES = [
  { id: 'Food & Dining',      color: '#FF9843', bg: 'rgba(255,152,67,0.15)',   icon: '🍽️' },
  { id: 'Rent & Utilities',   color: '#38BDF8', bg: 'rgba(56,189,248,0.15)',   icon: '🏠' },
  { id: 'Travel & Fuel',      color: '#A78BFA', bg: 'rgba(167,139,250,0.15)',  icon: '✈️' },
  { id: 'Tech & Gadgets',     color: '#6C63FF', bg: 'rgba(108,99,255,0.15)',   icon: '💻' },
  { id: 'Entertainment',      color: '#F472B6', bg: 'rgba(244,114,182,0.15)',  icon: '🎬' },
  { id: 'Health & Fitness',   color: '#10D98A', bg: 'rgba(16,217,138,0.15)',   icon: '💊' },
  { id: 'Shopping',           color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',   icon: '🛍️' },
  { id: 'Subscriptions',      color: '#34D399', bg: 'rgba(52,211,153,0.15)',   icon: '📺' },
  { id: 'Education',          color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',   icon: '📚' },
  { id: 'Miscellaneous',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', icon: '📦' },
]

export const PAYMENT_METHODS = [
  { id: 'UPI',         icon: '📱', color: '#6C63FF' },
  { id: 'Credit Card', icon: '💳', color: '#FF5E7A' },
  { id: 'Debit Card',  icon: '🏧', color: '#38BDF8' },
  { id: 'Cash',        icon: '💵', color: '#10D98A' },
  { id: 'Net Banking', icon: '🏦', color: '#FFAA3B' },
  { id: 'Wallet',      icon: '👛', color: '#A78BFA' },
]

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD']

export const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ', SGD: 'S$',
}

export function getCategoryMeta(id) {
  return CATEGORIES.find(c => c.id === id) || { color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', icon: '📦' }
}

export function getPaymentMeta(id) {
  return PAYMENT_METHODS.find(p => p.id === id) || { icon: '💳', color: '#9CA3AF' }
}

export function formatCurrency(amount, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`
  return `${symbol}${amount?.toFixed(2) ?? '0.00'}`
}

export function formatAmount(amount, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function calcHealthScore(summary) {
  if (!summary) return 75
  let score = 100
  const { mom_change_pct, daily_avg, total_month, category_breakdown } = summary
  if (mom_change_pct > 20) score -= 20
  else if (mom_change_pct > 10) score -= 10
  const topCat = category_breakdown?.[0]
  if (topCat && total_month > 0 && (topCat.total / total_month) > 0.6) score -= 15
  if (mom_change_pct < -10) score += 10
  return Math.min(100, Math.max(20, Math.round(score)))
}

export const CHART_COLORS = CATEGORIES.map(c => c.color)

export const AI_PROVIDERS = [
  { id: 'claude',  label: 'Claude (Anthropic)',  placeholder: 'sk-ant-...' },
  { id: 'openai',  label: 'OpenAI GPT-4o',       placeholder: 'sk-...' },
  { id: 'ollama',  label: 'Ollama (Local LLM)',   placeholder: 'No key needed' },
]
