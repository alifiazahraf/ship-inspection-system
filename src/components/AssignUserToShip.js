import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const AssignUserToShip = () => {
  const [users, setUsers] = useState([]);
  const [ships, setShips] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedShip, setSelectedShip] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    assignmentId: null,
    deleting: false
  });

  // Fetch users, ships, and assignments
  useEffect(() => {
    fetchUsers();
    fetchShips();
    fetchAssignments();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_list')
      .select('id, email, role')
      .eq('role', 'user');
    if (!error) setUsers(data);
  };

  const fetchShips = async () => {
    const { data, error } = await supabase
      .from('ships')
      .select('id, ship_name, ship_code');
    if (!error) setShips(data);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, user_id, ship_id, assigned_at');
    if (!error) setAssignments(data);
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedShip) {
      toast.error('Pilih user dan kapal!');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('assignments')
      .insert([{ user_id: selectedUser, ship_id: selectedShip }]);
    if (error) {
      toast.error('Gagal assign: ' + error.message);
    } else {
      toast.success('Berhasil assign user ke kapal!');
      fetchAssignments();
    }
    setLoading(false);
  };

  const handleDelete = (id) => {
    setDeleteConfirmation({
      isOpen: true,
      assignmentId: id,
      deleting: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.assignmentId) return;
    
    setDeleteConfirmation(prev => ({ ...prev, deleting: true }));
    
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', deleteConfirmation.assignmentId);
      
      if (error) {
        toast.error('Gagal hapus assignment: ' + error.message);
      } else {
        toast.success('Assignment berhasil dihapus');
        fetchAssignments();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Terjadi kesalahan saat menghapus assignment');
    } finally {
      setDeleteConfirmation({
        isOpen: false,
        assignmentId: null,
        deleting: false
      });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      assignmentId: null,
      deleting: false
    });
  };

  return (
    <div className="bg-white rounded-3 p-4 mb-4">
      <h4 className="mb-3">Assign User ke Kapal</h4>
      <div className="row g-2 align-items-end">
        <div className="col-md-5">
          <label className="form-label">User</label>
          <select className="form-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">Pilih User</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label">Kapal</label>
          <select className="form-select" value={selectedShip} onChange={e => setSelectedShip(e.target.value)}>
            <option value="">Pilih Kapal</option>
            {ships.map(s => (
              <option key={s.id} value={s.id}>{s.ship_name} ({s.ship_code})</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100" onClick={handleAssign} disabled={loading}>
            Assign
          </button>
        </div>
      </div>
      <hr />
      <h5 className="mb-2">Daftar Assignment</h5>
      <ul className="list-group">
        {assignments.map(a => (
          <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>
              {users.find(u => u.id === a.user_id)?.email} → {ships.find(s => s.id === a.ship_id)?.ship_name}
            </span>
            <button 
              className="btn btn-sm btn-danger" 
              onClick={() => handleDelete(a.id)}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#dc2626';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#fecaca';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-trash me-1"></i>
              Hapus
            </button>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Konfirmasi Hapus Assignment
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={cancelDelete}
                  disabled={deleteConfirmation.deleting}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Apakah Anda yakin ingin menghapus assignment ini?
                </p>
                {deleteConfirmation.assignmentId && (
                  <div className="alert alert-info py-2 mb-0">
                    <small>
                      <strong>User:</strong> {users.find(u => u.id === assignments.find(a => a.id === deleteConfirmation.assignmentId)?.user_id)?.email || '-'}
                      <br />
                      <strong>Kapal:</strong> {ships.find(s => s.id === assignments.find(a => a.id === deleteConfirmation.assignmentId)?.ship_id)?.ship_name || '-'}
                    </small>
                  </div>
                )}
                <div className="alert alert-warning py-2 mb-0 mt-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Assignment yang sudah dihapus tidak dapat dikembalikan.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cancelDelete}
                  disabled={deleteConfirmation.deleting}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  disabled={deleteConfirmation.deleting}
                >
                  {deleteConfirmation.deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Ya, Hapus Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignUserToShip;
