// AFTER
const BASE = "https://expense-trackerbackend-225b.onrender.com/api";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// Expenses
export const api = {
  expenses: {
    list: (params = {}) => req(`/expenses?${new URLSearchParams(params)}`),
    create: (data) => req('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => req(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => req(`/expenses/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    summary: () => req('/analytics/summary'),
    budgetVsActual: () => req('/analytics/budget-vs-actual'),
    dailySpending: () => req('/analytics/daily-spending'),
  },
  budgets: {
    list: () => req('/budgets'),
    upsert: (data) => req('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => req(`/budgets/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => req('/settings'),
    update: (data) => req('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  ai: {
    chat: (data) => req('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
    insights: () => req('/ai/insights'),
  },
  export: {
    csv: () => window.open('/api/export/csv', '_blank'),
    json: () => window.open('/api/export/json', '_blank'),
  },
}

export default api
