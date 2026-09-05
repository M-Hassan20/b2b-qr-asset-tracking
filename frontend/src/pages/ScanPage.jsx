import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import {
  QrCode,
  ShieldCheck,
  User,
  MapPin,
  Tag,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const ScanPage = () => {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    const searchParams = new URLSearchParams(window.location.search);
    const tenantId = searchParams.get('t') || searchParams.get('tenantId');

    if (!token || !tenantId) {
      setError('Invalid or incomplete QR scan link. Missing tenant or asset identifier.');
      setLoading(false);
      return;
    }

    apiClient
      .resolvePublicScan(token, tenantId)
      .then((res) => {
        setAsset(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Asset not found or no longer publicly accessible.');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '460px', width: '100%' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)', marginBottom: '12px' }}>
            <Sparkles size={14} color="#818cf8" />
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#a5b4fc' }}>Vision71 Asset Identity</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Public Asset Registry
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Sanitized public profile verified via encrypted QR token
          </p>
        </div>

        {loading && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Verifying asset authentication...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={24} color="#f87171" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fca5a5', marginBottom: '8px' }}>
              Asset Lookup Failed
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {error}
            </p>
          </div>
        )}

        {asset && !loading && !error && (
          <div className="glass-panel" style={{ padding: '28px', borderTop: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#818cf8', fontWeight: '600', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  {asset.assetCode}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '700', marginTop: '6px', color: '#ffffff' }}>
                  {asset.name}
                </h2>
              </div>
              <StatusBadge status={asset.status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <Tag size={15} color="#94a3b8" />
              <span>Category: <strong style={{ color: '#e2e8f0' }}>{asset.category}</strong></span>
            </div>

            {asset.description && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  {asset.description}
                </p>
              </div>
            )}

            {/* Assignment Section */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '12px' }}>
                Current Assignment
              </h3>

              {asset.assignedTo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {asset.assignedTo.type === 'employee' ? (
                      <User size={18} color="#818cf8" />
                    ) : (
                      <MapPin size={18} color="#818cf8" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#f8fafc' }}>
                      {asset.assignedTo.type === 'employee'
                        ? asset.assignedTo.displayName
                        : asset.assignedTo.name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {asset.assignedTo.type === 'employee'
                        ? asset.assignedTo.title || 'Staff Member'
                        : `Location (${asset.assignedTo.locationTyp || 'Facility'})`}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-subtle)', fontSize: '0.875rem', fontStyle: 'italic', padding: '8px 0' }}>
                  This asset is currently in pool inventory (Unassigned).
                </div>
              )}
            </div>

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Sanitized profile • Internal IDs and contact info are private</span>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/login" style={{ fontSize: '0.8125rem', color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}>
            Staff Login & Management Portal →
          </a>
        </div>
      </div>
    </div>
  );
};
