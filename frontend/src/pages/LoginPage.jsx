import React, { useState } from 'react';
import { apiClient } from '../api/apiClient';
import { Box, Lock, Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react';

export const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@vision71.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.login(email, password);
      apiClient.setAuth(res.data);
      if (onLoginSuccess) {
        onLoginSuccess(res.data.user);
      } else {
        window.location.pathname = '/dashboard';
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@vision71.com');
      setPassword('AdminPass123!');
    } else {
      setEmail('viewer@vision71.com');
      setPassword('ViewerPass123!');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)' }}>
            <Box size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Vision71 Assets
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            B2B Enterprise Asset Lifecycle & QR Tracking
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px', color: '#f8fafc' }}>
            Staff Sign In
          </h2>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: '#fca5a5', fontSize: '0.8125rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
                <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Quick Fill Demo Accounts:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDemoCredentials('admin')}
              >
                Admin (Full Access)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDemoCredentials('viewer')}
              >
                Viewer (Read Only)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
