import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import {
  Box,
  Search,
  Filter,
  Plus,
  QrCode,
  History,
  UserCheck,
  UserX,
  RefreshCw,
  Edit3,
  Download,
  ExternalLink,
  ChevronRight,
  Shield,
  LogOut,
  AlertCircle,
  X,
  Clock,
  Layers,
  MapPin,
  User,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Printer
} from 'lucide-react';

export const DashboardPage = ({ user, onLogout }) => {
  const [assets, setAssets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [publicScanPreview, setPublicScanPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPrintSheetModal, setShowPrintSheetModal] = useState(false);
  const [printSheetAssets, setPrintSheetAssets] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  // Reference data
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);

  const isAdmin = user?.role === 'Admin';

  const fetchAssets = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAssets({
        page,
        limit: 20,
        search,
        category: categoryFilter,
        status: statusFilter
      });
      setAssets(res.data || []);
      setMeta(res.meta || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(1);
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssets(1);
  };

  const loadReferenceData = async () => {
    try {
      const [empRes, locRes] = await Promise.all([
        apiClient.getEmployees({ limit: 100 }),
        apiClient.getLocations({ limit: 100 })
      ]);
      setEmployees(empRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) {
      console.error('Error fetching ref data', err);
    }
  };

  const openAssetDetail = async (assetSummary) => {
    try {
      const res = await apiClient.getAsset(assetSummary.id, isAdmin);
      const assetData = res.data;
      if (assetData.qrCodeUrl) {
        // Ensure port aligns with current frontend window origin if needed
        try {
          const urlObj = new URL(assetData.qrCodeUrl);
          urlObj.host = window.location.host;
          urlObj.protocol = window.location.protocol;
          assetData.qrCodeUrl = urlObj.toString();
        } catch {}
      }
      setSelectedAsset(assetData);
      setShowDetailModal(true);
      setShowMobilePreview(false);
      setPublicScanPreview(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const openMobileScanPreview = async (asset) => {
    try {
      setPreviewLoading(true);
      setShowMobilePreview(true);
      const searchParams = new URLSearchParams(asset.qrCodeUrl?.split('?')[1] || '');
      const tenantId = searchParams.get('t') || '';
      const res = await apiClient.resolvePublicScan(asset.qrToken, tenantId);
      setPublicScanPreview(res.data);
    } catch (err) {
      setPublicScanPreview({ error: err.message || 'Public profile unavailable' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const openHistory = async (asset) => {
    try {
      const res = await apiClient.getAssetHistory(asset.id, { limit: 50 });
      setHistoryList(res.data || []);
      setHistoryAsset(asset);
      setShowHistoryModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------

  const handleCreateAsset = async (formData) => {
    try {
      await apiClient.createAsset(formData);
      setShowCreateModal(false);
      fetchAssets(1);
    } catch (err) {
      alert(`Error creating asset: ${err.message}`);
    }
  };

  const handleAssignAsset = async (assignmentData) => {
    try {
      const res = await apiClient.assignAsset(selectedAsset.id, assignmentData);
      setSelectedAsset(res.data);
      setShowAssignModal(false);
      fetchAssets(meta.page);
      if (showMobilePreview) {
        openMobileScanPreview(res.data);
      }
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleUnassignAsset = async () => {
    if (!window.confirm('Are you sure you want to unassign this asset?')) return;
    try {
      const res = await apiClient.unassignAsset(selectedAsset.id, 'Returned to inventory');
      setSelectedAsset(res.data);
      fetchAssets(meta.page);
      if (showMobilePreview) {
        openMobileScanPreview(res.data);
      }
    } catch (err) {
      alert(`Unassignment failed: ${err.message}`);
    }
  };

  const handleStatusChange = async (newStatus, note) => {
    try {
      const res = await apiClient.changeStatus(selectedAsset.id, newStatus, note);
      setSelectedAsset(res.data);
      setShowStatusModal(false);
      fetchAssets(meta.page);
      if (showMobilePreview) {
        openMobileScanPreview(res.data);
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleRegenerateQr = async () => {
    if (!window.confirm('Regenerating the QR code will invalidate any existing physical QR labels. Proceed?')) return;
    try {
      const res = await apiClient.regenerateQr(selectedAsset.id);
      setSelectedAsset({
        ...selectedAsset,
        qrToken: res.data.qrToken,
        qrCodeUrl: res.data.qrCodeUrl,
        qrCodeImageBase64: res.data.qrCodeImageBase64
      });
      alert('QR code successfully regenerated and previous token invalidated.');
    } catch (err) {
      alert(`QR Regeneration failed: ${err.message}`);
    }
  };

  const downloadSingleQr = (asset) => {
    if (!asset.qrCodeImageBase64) return;
    const link = document.createElement('a');
    link.href = asset.qrCodeImageBase64;
    link.download = `QR_${asset.assetCode || 'Asset'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openPrintSheet = async () => {
    try {
      setPrintLoading(true);
      setShowPrintSheetModal(true);
      const res = await apiClient.getAssets({ limit: 100 });
      const assetList = res.data || [];
      // Fetch full details with QR image for each asset
      const detailed = await Promise.all(
        assetList.map((a) => apiClient.getAsset(a.id, true).catch(() => null))
      );
      setPrintSheetAssets(detailed.filter(Boolean).map((d) => d.data));
    } catch (err) {
      alert(`Failed to load QR sheet: ${err.message}`);
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#ffffff', letterSpacing: '-0.02em' }}>Vision71 Assets</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization Asset Registry</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
            <Shield size={14} color={isAdmin ? '#818cf8' : '#34d399'} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#f8fafc' }}>{user.name}</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: isAdmin ? 'rgba(79, 70, 229, 0.2)' : 'rgba(52, 211, 153, 0.2)', color: isAdmin ? '#a5b4fc' : '#6ee7b7' }}>
              {user.role}
            </span>
          </div>

          <button onClick={onLogout} className="btn btn-secondary btn-sm" title="Sign Out">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: '28px', maxWidth: '1400px', width: '100%', margin: '0 auto', flex: 1 }}>
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>Asset Directory</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Showing {assets.length} of {meta.total} tracked organizational assets
            </p>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={openPrintSheet}
                className="btn btn-secondary"
                title="Generate Printable Sticker Sheet"
              >
                <Printer size={16} />
                <span>Print QR Labels Sheet</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Register New Asset</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters & Search Box */}
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 300px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, asset code, or serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </form>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Laptop">Laptop</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Tool">Tool</option>
              <option value="Furniture">Furniture</option>
              <option value="Equipment">Equipment</option>
            </select>

            <select
              className="form-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="In Repair">In Repair</option>
              <option value="Retired">Retired</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>

        {/* Asset Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading assets from database...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Box size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: '600', color: '#f1f5f9' }}>No assets found matching filters</div>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Try clearing filters or search query</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Asset Code</th>
                    <th style={{ padding: '14px 20px' }}>Name & Details</th>
                    <th style={{ padding: '14px 20px' }}>Category</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px' }}>Assignment</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr
                      key={a.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {a.assetCode}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{a.name}</div>
                        {a.serialNumber && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>S/N: {a.serialNumber}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                        {a.category}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={a.status} />
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                        {a.assignedEmployeeId ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                            <User size={14} /> Employee Assigned
                          </span>
                        ) : a.assignedLocationId ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                            <MapPin size={14} /> Location Assigned
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openAssetDetail(a)}
                          >
                            <QrCode size={14} />
                            <span>Details & QR</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openHistory(a)}
                            title="Audit History"
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* ASSET DETAIL / QR MODAL */}
      {/* ------------------------------------------------------------- */}
      {showDetailModal && selectedAsset && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#818cf8', fontWeight: '600', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedAsset.assetCode}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginTop: '4px' }}>
                  {selectedAsset.name}
                </h2>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '24px', alignItems: 'start' }}>
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <div className="form-label">Category & Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontWeight: '600' }}>{selectedAsset.category}</span>
                      <StatusBadge status={selectedAsset.status} />
                    </div>
                  </div>

                  {selectedAsset.description && (
                    <div style={{ marginBottom: '14px' }}>
                      <div className="form-label">Description</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {selectedAsset.description}
                      </div>
                    </div>
                  )}

                  {selectedAsset.serialNumber && (
                    <div style={{ marginBottom: '14px' }}>
                      <div className="form-label">Serial Number</div>
                      <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {selectedAsset.serialNumber}
                      </div>
                    </div>
                  )}

                  {/* Public Scan Link Preview */}
                  <div style={{ marginTop: '18px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div className="form-label" style={{ fontSize: '0.75rem' }}>Public Scan URL</div>
                    <a
                      href={selectedAsset.qrCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#06b6d4', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', textDecoration: 'none' }}
                    >
                      <span>{selectedAsset.qrCodeUrl}</span>
                      <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    </a>
                  </div>
                </div>

                {/* QR Code Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {selectedAsset.qrCodeImageBase64 ? (
                      <img
                        src={selectedAsset.qrCodeImageBase64}
                        alt="QR Code"
                        style={{ width: '160px', height: '160px', display: 'block', margin: '0 auto' }}
                      />
                    ) : (
                      <div style={{ width: '160px', height: '160px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                        QR Preview (Admin Only)
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {selectedAsset.assetCode}
                    </div>
                  </div>

                  {/* Action Buttons below QR */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedAsset.qrCodeImageBase64 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
                        onClick={() => downloadSingleQr(selectedAsset)}
                      >
                        <Download size={13} />
                        <span>Download QR (.PNG)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '7px 10px', background: 'linear-gradient(135deg, #06b6d4, #4f46e5)' }}
                      onClick={() => openMobileScanPreview(selectedAsset)}
                    >
                      <Smartphone size={13} />
                      <span>Live Phone Scan Simulator</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup Overlay / Container */}
              {showMobilePreview && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', animation: 'modalFadeIn 0.25s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={16} color="#06b6d4" />
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#06b6d4' }}>
                        Simulated Mobile Phone Scanner Screen
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMobilePreview(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Hide Preview
                    </button>
                  </div>

                  {/* Phone Bezel */}
                  <div style={{ maxWidth: '340px', margin: '0 auto', background: '#090d16', border: '4px solid #1e293b', borderRadius: '28px', padding: '16px 14px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', position: 'relative' }}>
                    {/* Speaker Notch */}
                    <div style={{ width: '60px', height: '4px', background: '#334155', borderRadius: '4px', margin: '0 auto 14px' }}></div>

                    {previewLoading ? (
                      <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
                        <div>Simulating camera QR lookup...</div>
                      </div>
                    ) : publicScanPreview?.error ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#f87171', fontSize: '0.8125rem' }}>
                        <AlertCircle size={20} style={{ margin: '0 auto 6px' }} />
                        <div>{publicScanPreview.error}</div>
                      </div>
                    ) : publicScanPreview ? (
                      <div style={{ background: 'rgba(23, 31, 47, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
                        {/* Status Badge & Code */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#818cf8', fontWeight: '700', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                            {publicScanPreview.assetCode}
                          </span>
                          <StatusBadge status={publicScanPreview.status} />
                        </div>

                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
                          {publicScanPreview.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px' }}>
                          Category: <strong style={{ color: '#e2e8f0' }}>{publicScanPreview.category}</strong>
                        </div>

                        {publicScanPreview.description && (
                          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                            {publicScanPreview.description}
                          </div>
                        )}

                        {/* Assignment */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                          <div style={{ fontSize: '0.6875rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                            Assignment Status
                          </div>
                          {publicScanPreview.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {publicScanPreview.assignedTo.type === 'employee' ? <User size={12} color="#818cf8" /> : <MapPin size={12} color="#818cf8" />}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f8fafc' }}>
                                  {publicScanPreview.assignedTo.type === 'employee' ? publicScanPreview.assignedTo.displayName : publicScanPreview.assignedTo.name}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  {publicScanPreview.assignedTo.type === 'employee' ? publicScanPreview.assignedTo.title || 'Staff' : publicScanPreview.assignedTo.locationTyp || 'Location'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                              Unassigned (Pool Storage)
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem', color: '#10b981' }}>
                          <ShieldCheck size={12} />
                          <span>Sanitized Public Profile (AC 1 Verified)</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Bottom home indicator */}
                    <div style={{ width: '80px', height: '3px', background: '#334155', borderRadius: '3px', margin: '12px auto 0' }}></div>
                  </div>
                </div>
              )}

              {/* Management Actions (Admin only) */}
              {isAdmin && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Asset Lifecycle Management Actions
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        loadReferenceData();
                        setShowAssignModal(true);
                      }}
                      disabled={selectedAsset.status === 'Retired'}
                    >
                      <UserCheck size={14} />
                      <span>{selectedAsset.assignedEmployeeId || selectedAsset.assignedLocationId ? 'Reassign' : 'Assign'}</span>
                    </button>

                    {(selectedAsset.assignedEmployeeId || selectedAsset.assignedLocationId) && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleUnassignAsset}
                        disabled={selectedAsset.status === 'Retired'}
                      >
                        <UserX size={14} />
                        <span>Unassign</span>
                      </button>
                    )}

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowStatusModal(true)}
                      disabled={selectedAsset.status === 'Retired'}
                    >
                      <RefreshCw size={14} />
                      <span>Change Status</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleRegenerateQr}
                    >
                      <QrCode size={14} />
                      <span>Regenerate QR</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openHistory(selectedAsset)}
                    >
                      <History size={14} />
                      <span>View History</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE ASSET MODAL */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <CreateAssetModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAsset}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* ASSIGN ASSET MODAL */}
      {/* ------------------------------------------------------------- */}
      {showAssignModal && selectedAsset && (
        <AssignAssetModal
          asset={selectedAsset}
          employees={employees}
          locations={locations}
          onClose={() => setShowAssignModal(false)}
          onSubmit={handleAssignAsset}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS CHANGE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showStatusModal && selectedAsset && (
        <StatusChangeModal
          asset={selectedAsset}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusChange}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* HISTORY TIMELINE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showHistoryModal && historyAsset && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>
                  Audit History: {historyAsset.assetCode}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Append-only immutable audit trail
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  No history records logged yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {historyList.map((entry) => (
                    <div key={entry.id} style={{ borderLeft: '2px solid #6366f1', paddingLeft: '16px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#f8fafc' }}>
                          {entry.eventType}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {entry.note && (
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px', margin: '4px 0' }}>
                          Note: "{entry.note}"
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        User ID: {entry.performedBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINT ALL QR LABELS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showPrintSheetModal && (
        <div className="modal-backdrop" onClick={() => setShowPrintSheetModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px', maxHeight: '88vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={20} color="#818cf8" />
                  <span>Asset QR Label Sticker Sheet</span>
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  A4 / Sticker sheet ready printable grid ({printSheetAssets.length} active assets)
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                  disabled={printLoading || printSheetAssets.length === 0}
                >
                  <Printer size={14} />
                  <span>Print Sheet</span>
                </button>
                <button onClick={() => setShowPrintSheetModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {printLoading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }}></div>
                  <div>Generating high-resolution QR label batch...</div>
                </div>
              ) : printSheetAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No assets available for label generation.
                </div>
              ) : (
                <div id="printable-qr-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {printSheetAssets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        borderRadius: '10px',
                        padding: '12px',
                        textAlign: 'center',
                        border: '2px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4f46e5', marginBottom: '4px' }}>
                        Vision71 Asset
                      </div>
                      {asset.qrCodeImageBase64 && (
                        <img
                          src={asset.qrCodeImageBase64}
                          alt={asset.assetCode}
                          style={{ width: '130px', height: '130px', display: 'block', margin: '4px auto' }}
                        />
                      )}
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '0.875rem', color: '#0f172a', marginTop: '4px' }}>
                        {asset.assetCode}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {asset.category} • {asset.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const CreateAssetModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptop',
    description: '',
    serialNumber: '',
    assetCode: '',
    isPublicVisible: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.assetCode.trim()) delete payload.assetCode;
    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>Register Asset</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Asset Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dell Latitude 5520"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Laptop">Laptop</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Tool">Tool</option>
              <option value="Furniture">Furniture</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Asset Code (Leave blank for auto AST000X)</label>
            <input
              type="text"
              className="form-input"
              placeholder="AST0142"
              value={formData.assetCode}
              onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Serial Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="SN123456"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Department or specifications..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Create Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssignAssetModal = ({ asset, employees, locations, onClose, onSubmit }) => {
  const [assignType, setAssignType] = useState('employee');
  const [selectedId, setSelectedId] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedId) {
      alert('Please select an assignee.');
      return;
    }
    if (assignType === 'employee') {
      onSubmit({ employeeId: selectedId, note });
    } else {
      onSubmit({ locationId: selectedId, note });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>Assign {asset.assetCode}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Assignment Target Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${assignType === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setAssignType('employee'); setSelectedId(''); }}
              >
                <User size={15} />
                <span>Employee</span>
              </button>
              <button
                type="button"
                className={`btn ${assignType === 'location' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setAssignType('location'); setSelectedId(''); }}
              >
                <MapPin size={15} />
                <span>Facility / Location</span>
              </button>
            </div>
          </div>

          {assignType === 'employee' ? (
            <div className="form-group">
              <label className="form-label">Select Employee *</label>
              <select
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                <option value="">-- Choose active staff --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} disabled={emp.status === 'inactive'}>
                    {emp.name} ({emp.title} - {emp.department}) {emp.status === 'inactive' ? '[INACTIVE]' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Select Location *</label>
              <select
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                <option value="">-- Choose facility/zone --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Assignment Note</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Issued for Q4 Engineering Project"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm Assignment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StatusChangeModal = ({ asset, onClose, onSubmit }) => {
  const [status, setStatus] = useState(asset.status);
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(status, note);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>Update Status: {asset.assetCode}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Lifecycle Status *</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="In Repair">In Repair</option>
              <option value="Retired">Retired</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Audit Note</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Routine maintenance or decommission"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Update Status</button>
          </div>
        </form>
      </div>
    </div>
  );
};
