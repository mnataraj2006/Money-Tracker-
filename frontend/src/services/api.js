import { Capacitor } from '@capacitor/core';

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

  try {
    console.log(`[API Request] ${config.method || 'GET'} ${url}`);
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'An error occurred while connecting to server');
    }

    return data;
  } catch (err) {
    console.error(`[API Error] Request to ${url} failed:`, err);
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to backend server at ${url}. Please check your internet connection.`);
    }
    throw err;
  }
}




// AUTH API
export const authAPI = {
  register: (fullName, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  googleLogin: (googleData) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify(googleData) }),
  getMe: () => request('/auth/me'),
  changePassword: (oldPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
  updateProfile: (fullName) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName }) })
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

// BANK ACCOUNTS API
export const bankAccountsAPI = {
  getAll: () => request('/bank-accounts'),
  getById: (id) => request(`/bank-accounts/${id}`),
  create: (accountData) => request('/bank-accounts', { method: 'POST', body: JSON.stringify(accountData) }),
  update: (id, accountData) => request(`/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(accountData) }),
  delete: (id) => request(`/bank-accounts/${id}`, { method: 'DELETE' }),
  verifyBalance: (id, actualBalance) =>
    request(`/bank-accounts/${id}/verify`, { method: 'POST', body: JSON.stringify({ actualBalance }) }),
  withdrawCash: (withdrawalData) =>
    request('/bank-accounts/withdraw', { method: 'POST', body: JSON.stringify(withdrawalData) })
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
  getDailyDetails: (date) => request(`/summary/daily-details${date ? '?date=' + date : ''}`),
  getMonthlySummary: (month) => request(`/summary/monthly-summary${month ? '?month=' + month : ''}`),
  getRangeReport: (from, to) => request(`/summary/range-report?from=${from}&to=${to}`)
};

// SETTINGS API
export const settingsAPI = {
  get: () => request('/settings'),
  update: (settingsData) => request('/settings', { method: 'PUT', body: JSON.stringify(settingsData) }),
  exportBackup: () => request('/settings/export'),
  restoreBackup: (backupData) => request('/settings/restore', { method: 'POST', body: JSON.stringify({ backupData }) })
};
