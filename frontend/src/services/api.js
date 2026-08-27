const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('money_tracker_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'An error occurred while connecting to server');
  }

  return data;
}

// AUTH API
export const authAPI = {
  register: (fullName, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  changePassword: (oldPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) })
};

// TRANSACTIONS API
export const transactionsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/transactions${query ? '?' + query : ''}`);
  },
  getById: (id) => request(`/transactions/${id}`),
  create: (txData) => request('/transactions', { method: 'POST', body: JSON.stringify(txData) }),
  update: (id, txData) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(txData) }),
  delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' })
};

// CASH API
export const cashAPI = {
  getExpected: (date) => request(`/cash/expected${date ? '?date=' + date : ''}`),
  saveCount: (countData) => request('/cash/count', { method: 'POST', body: JSON.stringify(countData) }),
  closeDay: (date) => request('/cash/close-day', { method: 'POST', body: JSON.stringify({ date }) })
};

// SUMMARY & HISTORY API
export const summaryAPI = {
  getDashboard: (date) => request(`/summary/dashboard${date ? '?date=' + date : ''}`),
  getHistory: (month) => request(`/summary/history${month ? '?month=' + month : ''}`),
  getMonthlySummary: (month) => request(`/summary/monthly-summary${month ? '?month=' + month : ''}`)
};

// SETTINGS API
export const settingsAPI = {
  get: () => request('/settings'),
  update: (settingsData) => request('/settings', { method: 'PUT', body: JSON.stringify(settingsData) }),
  exportBackup: () => request('/settings/export'),
  restoreBackup: (backupData) => request('/settings/restore', { method: 'POST', body: JSON.stringify({ backupData }) })
};
