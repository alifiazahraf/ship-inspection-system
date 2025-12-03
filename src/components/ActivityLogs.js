import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const ActivityLogs = ({ onBack }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    activityType: '',
    userEmail: '',
    shipName: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      // Apply filters
      if (filter.activityType) {
        query = query.eq('activity_type', filter.activityType);
      }
      if (filter.userEmail) {
        query = query.ilike('user_email', `%${filter.userEmail}%`);
      }
      if (filter.shipName) {
        query = query.ilike('ship_name', `%${filter.shipName}%`);
      }
      if (filter.dateFrom) {
        query = query.gte('timestamp', filter.dateFrom);
      }
      if (filter.dateTo) {
        query = query.lte('timestamp', filter.dateTo + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Gagal memuat activity logs');
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat logs');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [filter]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  const getActivityTypeColor = (type) => {
    switch (type) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'danger';
      case 'VIEW': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div>
      {/* Page Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <button 
            className="btn d-flex align-items-center justify-content-center"
            onClick={onBack}
            style={{ 
              width: '44px', 
              height: '44px',
              borderRadius: '10px',
              background: 'white',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h4 className="mb-1" style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}>
              Activity Logs
            </h4>
            <p className="mb-0" style={{ 
              fontSize: '0.875rem', 
              color: '#64748b',
              fontWeight: '400',
            }}>
              System Activity Tracking
            </p>
          </div>
        </div>
        
      </div>

      {/* Content Container */}
      <div>

        {/* Filters Card */}
        <div className="card mb-4" style={{
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}>
          <div className="card-header" style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '2px solid #bfdbfe',
            borderRadius: '12px 12px 0 0',
            padding: '1rem 1.5rem',
          }}>
            <h6 className="mb-0 fw-semibold" style={{ color: '#1e40af' }}>
              <i className="bi bi-funnel me-2"></i>
              Filter Logs
            </h6>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <div className="row g-3">
              <div className="col-md-2">
                <label className="form-label fw-medium" style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Activity Type
                </label>
                <select 
                  className="form-select"
                  value={filter.activityType}
                  onChange={(e) => setFilter({...filter, activityType: e.target.value})}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">Semua</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="VIEW">VIEW</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label fw-medium" style={{ fontSize: '0.875rem', color: '#475569' }}>
                  User Email
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari email..."
                  value={filter.userEmail}
                  onChange={(e) => setFilter({...filter, userEmail: e.target.value})}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label fw-medium" style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Ship Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari kapal..."
                  value={filter.shipName}
                  onChange={(e) => setFilter({...filter, shipName: e.target.value})}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-medium" style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter({...filter, dateFrom: e.target.value})}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-medium" style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filter.dateTo}
                  onChange={(e) => setFilter({...filter, dateTo: e.target.value})}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
            <div className="row mt-3">
              <div className="col-auto">
                <button 
                  className="btn"
                  onClick={() => setFilter({
                    activityType: '',
                    userEmail: '',
                    shipName: '',
                    dateFrom: '',
                    dateTo: ''
                  })}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table Card */}
        <div className="card" style={{
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}>
          <div className="card-header" style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '2px solid #bfdbfe',
            borderRadius: '12px 12px 0 0',
            padding: '1rem 1.5rem',
          }}>
            <h6 className="mb-0 fw-semibold" style={{ color: '#1e40af' }}>
              <i className="bi bi-list-ul me-2"></i>
              Activity Logs ({logs.length} records)
            </h6>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status" style={{ color: '#1e40af' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted" style={{ fontSize: '0.875rem' }}>Memuat activity logs...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ 
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderBottom: '2px solid #bfdbfe',
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Timestamp</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>User</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Role</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Activity</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Description</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Ship</th>
                      <th style={{ 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Table</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr 
                          key={log.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ 
                            padding: '1rem 0.75rem',
                            fontSize: '0.875rem',
                            color: '#64748b',
                          }}>
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td style={{ 
                            padding: '1rem 0.75rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#334155',
                          }}>
                            {log.user_email}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <span 
                              className="badge"
                              style={{
                                background: log.user_role === 'admin' 
                                  ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
                                  : '#64748b',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                              }}
                            >
                              {log.user_role.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <span 
                              className="badge"
                              style={{
                                background: getActivityTypeColor(log.activity_type) === 'success' ? '#10b981' :
                                  getActivityTypeColor(log.activity_type) === 'warning' ? '#f59e0b' :
                                  getActivityTypeColor(log.activity_type) === 'danger' ? '#ef4444' :
                                  getActivityTypeColor(log.activity_type) === 'info' ? '#3b82f6' : '#64748b',
                                color: 'white',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                              }}
                            >
                              {log.activity_type}
                            </span>
                          </td>
                          <td style={{ 
                            padding: '1rem 0.75rem',
                            maxWidth: '300px',
                            fontSize: '0.875rem',
                            color: '#475569',
                          }}>
                            <span className="text-wrap">{log.activity_description}</span>
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            {log.ship_name ? (
                              <span style={{ 
                                color: '#1e40af',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                              }}>
                                {log.ship_name}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <code style={{ 
                              fontSize: '0.75rem',
                              background: '#f1f5f9',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              color: '#475569',
                            }}>
                              {log.table_affected}
                            </code>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <div style={{ color: '#94a3b8' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}></i>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>Belum ada activity logs</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs; 