const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const API_BASE = rawBase
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`)
  : '/api';

export const apiClient = {
  getToken() {
    return localStorage.getItem('v71_auth_token');
  },

  setAuth(data) {
    localStorage.setItem('v71_auth_token', data.token);
    localStorage.setItem('v71_user', JSON.stringify(data.user));
  },

  clearAuth() {
    localStorage.removeItem('v71_auth_token');
    localStorage.removeItem('v71_user');
  },

  getUser() {
    const u = localStorage.getItem('v71_user');
    return u ? JSON.parse(u) : null;
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let message = data.error?.message;

        if (!message) {
          if (response.status === 401) {
            message = 'Invalid email address or password. Please try again.';
          } else if (response.status === 403) {
            message = 'You do not have permission to perform this action.';
          } else if (response.status === 404) {
            message = 'The requested item or endpoint was not found.';
          } else if (response.status === 409) {
            message = 'This action conflicts with current asset state or existing records.';
          } else if (response.status === 422) {
            message = 'Please check the entered information and try again.';
          } else if (response.status === 429) {
            message = 'Too many requests. Please wait a moment and try again.';
          } else if (response.status >= 500) {
            message = 'The server encountered an error. Please try again in a few moments.';
          } else {
            message = 'Something went wrong. Please try again.';
          }
        }

        const err = new Error(message);
        err.status = response.status;
        err.code = data.error?.code || 'ERROR';
        err.fields = data.error?.fields || {};
        throw err;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
        const netErr = new Error('Unable to connect to the server. Please check your internet connection or backend server status.');
        netErr.status = 0;
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
      }
      throw err;
    }
  },

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  // Public scan
  resolvePublicScan(qrToken, tenantId) {
    return this.request(`/public/scan/${qrToken}?t=${tenantId}`);
  },

  // Assets
  getAssets(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    return this.request(`/assets?${searchParams.toString()}`);
  },

  getAsset(id, includeQrImage = false) {
    return this.request(`/assets/${id}${includeQrImage ? '?includeQrImage=true' : ''}`);
  },

  createAsset(assetData) {
    return this.request('/assets', {
      method: 'POST',
      body: assetData
    });
  },

  updateAsset(id, data) {
    return this.request(`/assets/${id}`, {
      method: 'PATCH',
      body: data
    });
  },

  assignAsset(id, data) {
    return this.request(`/assets/${id}/assign`, {
      method: 'POST',
      body: data
    });
  },

  unassignAsset(id, note) {
    return this.request(`/assets/${id}/unassign`, {
      method: 'POST',
      body: { note }
    });
  },

  changeStatus(id, status, note) {
    return this.request(`/assets/${id}/status`, {
      method: 'POST',
      body: { status, note }
    });
  },

  regenerateQr(id) {
    return this.request(`/assets/${id}/qr/regenerate`, {
      method: 'POST'
    });
  },

  getAssetHistory(id, params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    return this.request(`/assets/${id}/history?${searchParams.toString()}`);
  },

  // Employees & Locations
  getEmployees(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    return this.request(`/employees?${searchParams.toString()}`);
  },

  getLocations(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    return this.request(`/locations?${searchParams.toString()}`);
  }
};
