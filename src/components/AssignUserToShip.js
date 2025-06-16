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

  const handleDelete = async (id) => {
    setLoading(true);
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Gagal hapus assignment');
    } else {
      toast.success('Assignment dihapus');
      fetchAssignments();
    }
    setLoading(false);
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
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Hapus</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssignUserToShip;
