const API_BASE = '/api';

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

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error?.message || 'Request failed');
      err.status = response.status;
      err.code = data.error?.code || 'UNKNOWN_ERROR';
      err.fields = data.error?.fields || {};
      throw err;
    }

    return data;
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
