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

  const getUserRoleColor = (role) => {
    return role === 'admin' ? 'primary' : 'secondary';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            className="btn btn-outline-secondary d-flex align-items-center" 
            onClick={onBack}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Kembali
          </button>
        </div>
        <h4 className="mb-0">Activity Logs</h4>
        <div></div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Filter Logs</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Activity Type</label>
              <select 
                className="form-select"
                value={filter.activityType}
                onChange={(e) => setFilter({...filter, activityType: e.target.value})}
              >
                <option value="">Semua</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VIEW">VIEW</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">User Email</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cari email..."
                value={filter.userEmail}
                onChange={(e) => setFilter({...filter, userEmail: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Ship Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cari kapal..."
                value={filter.shipName}
                onChange={(e) => setFilter({...filter, shipName: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Dari Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={filter.dateFrom}
                onChange={(e) => setFilter({...filter, dateFrom: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sampai Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={filter.dateTo}
                onChange={(e) => setFilter({...filter, dateTo: e.target.value})}
              />
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-auto">
              <button 
                className="btn btn-secondary"
                onClick={() => setFilter({
                  activityType: '',
                  userEmail: '',
                  shipName: '',
                  dateFrom: '',
                  dateTo: ''
                })}
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Activity Logs ({logs.length} records)</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Activity</th>
                    <th>Description</th>
                    <th>Ship</th>
                    <th>Table</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.85rem' }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td>
                          <span className="fw-medium">{log.user_email}</span>
                        </td>
                        <td>
                          <span className={`badge bg-${getUserRoleColor(log.user_role)}`}>
                            {log.user_role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${getActivityTypeColor(log.activity_type)}`}>
                            {log.activity_type}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px' }}>
                          <span className="text-wrap">{log.activity_description}</span>
                        </td>
                        <td>
                          {log.ship_name ? (
                            <span className="text-primary fw-medium">{log.ship_name}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem' }}>{log.table_affected}</code>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                          Belum ada activity logs
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
  );
};

export default ActivityLogs; 