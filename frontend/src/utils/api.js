const BASE = "https://expense-trackerbackend-225b.onrender.com/api";

async function req(path, options = {}) {
  const token = localStorage.getItem('token');
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-logout'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

async function downloadFile(path, filename) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const api = {
  auth: {
    login: async (username, password) => {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(err.detail || 'Login failed');
      }
      return res.json();
    },
    register: (data) => req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => req('/auth/me'),
  },
  admin: {
    listUsers: () => req('/admin/users'),
    resetPassword: (target_user_id, new_password) => req('/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify({ target_user_id, new_password })
    }),
    deleteUser: (id) => req(`/admin/users/${id}`, { method: 'DELETE' }),
  },
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
    csv: () => downloadFile('/export/csv', 'expenses.csv'),
    json: () => downloadFile('/export/json', 'expenses.json'),
  },
};

export default api;
