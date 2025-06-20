import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const AddFindingForm = ({ selectedShip, onFindingAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    finding: '',
    picShip: '',
    picOffice: '',
    category: 'Safety',
    status: 'Open',
    date: new Date().toISOString().split('T')[0]
  });
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Safety', 'Environmental', 'Operational', 'Structural', 
    'Machinery', 'Navigation', 'Documentation', 'Security'
  ];

  const statuses = ['Open', 'Closed'];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const uploadPhoto = async (file, type) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedShip.id}/${type}_${Date.now()}.${fileExt}`;
    const filePath = `findings/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('finding-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('finding-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload before photo if exists
      let beforePhotoUrl = null;
      if (beforePhoto) {
        beforePhotoUrl = await uploadPhoto(beforePhoto, 'before');
      }

      // First, get the latest finding number for this ship
      const { data: latestFinding, error: countError } = await supabase
        .from('findings')
        .select('no')
        .eq('ship_id', selectedShip.id)
        .order('no', { ascending: false })
        .limit(1);

      if (countError) {
        throw countError;
      }

      // Calculate the next finding number
      const nextNo = latestFinding && latestFinding.length > 0 ? latestFinding[0].no + 1 : 1;

      const { error } = await supabase
        .from('findings')
        .insert([{
          ship_id: selectedShip.id,
          no: nextNo,
          finding: formData.finding,
          category: formData.category,
          status: formData.status,
          date: formData.date,
          pic_ship: formData.picShip,
          pic_office: formData.picOffice,
          before_photo: beforePhotoUrl,
          created_by: 'admin' // You might want to get this from your auth context
        }]);

      if (error) {
        setError(error.message);
        toast.error('Gagal menambahkan temuan: ' + error.message);
      } else {
        setFormData({
          finding: '',
          picShip: '',
          picOffice: '',
          category: 'Safety',
          status: 'Open',
          date: new Date().toISOString().split('T')[0]
        });
        setBeforePhoto(null);
        onFindingAdded(); // Call without parameters since we'll fetch fresh data
      }
    } catch (error) {
      setError('Error adding finding: ' + error.message);
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test function untuk debugging
  const testConnection = async () => {
    try {
      console.log('Testing connection to backend...');
      const response = await fetch('http://localhost:5000/', {
        method: 'GET'
      });
      const data = await response.json();
      console.log('Backend connection test:', data);
      toast.success('Backend connection OK: ' + data.message);
    } catch (error) {
      console.error('Backend connection test failed:', error);
      toast.error('Backend connection failed: ' + error.message);
    }
  };

  // Test function untuk debugging token
  // const testTokenAuth = async () => {
  //   try {
  //     console.log('Testing token authentication...');
  //     console.log('Using token:', token ? token.substring(0, 20) + '...' : 'null');
      
  //     const response = await fetch('http://localhost:5000/api/ships', {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
      
  //     console.log('Auth test response status:', response.status);
      
  //     if (response.ok) {
  //       const data = await response.json();
  //       console.log('Auth test success:', data);
  //       alert('Token authentication OK! Ships: ' + data.length);
  //     } else {
  //       const text = await response.text();
  //       console.error('Auth test failed:', text);
  //       alert('Token authentication failed: ' + text);
  //     }
  //   } catch (error) {
  //     console.error('Auth test error:', error);
  //     alert('Auth test error: ' + error.message);
  //   }
  // };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tambah Temuan Inspeksi - {selectedShip.ship_name}</h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={loading}></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <strong>Error:</strong> {error}
                <hr />
                <small>
                  <strong>Debug info:</strong> Periksa console browser (F12) untuk detail lengkap.
                  <br />
                  <div className="mt-2">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={testConnection}
                      disabled={loading}
                    >
                      Test Koneksi Backend
                    </button>
                    {/* <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary"
                      onClick={testTokenAuth}
                    >
                      Test Token Auth
                    </button> */}
                  </div>
                </small>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Tanggal Temuan *</label>
                    <input
                      type="date"
                      className="form-control"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Kategori Temuan *</label>
                    <select
                      className="form-select"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Status *</label>
                    <select
                      className="form-select"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Foto Before</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setBeforePhoto(e.target.files[0])}
                      disabled={loading}
                    />
                    <div className="form-text">Format: JPG, PNG, GIF. Max: 5MB</div>
                  </div>
                </div>
              </div>

              {beforePhoto && (
                <div className="mb-3">
                  <label className="form-label">Preview Foto Before:</label>
                  <div className="border rounded p-2">
                    <img 
                      src={URL.createObjectURL(beforePhoto)} 
                      alt="Preview" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
                    />
                    <small className="text-muted d-block mt-1">
                      File: {beforePhoto.name} ({(beforePhoto.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Deskripsi Temuan *</label>
                <textarea
                  className="form-control"
                  name="finding"
                  rows="4"
                  value={formData.finding}
                  onChange={handleInputChange}
                  required
                  placeholder="Deskripsikan temuan inspeksi secara detail..."
                  disabled={loading}
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">PIC Kapal *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="picShip"
                      value={formData.picShip}
                      onChange={handleInputChange}
                      required
                      placeholder="Nama PIC dari kapal"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">PIC Kantor *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="picOffice"
                      value={formData.picOffice}
                      onChange={handleInputChange}
                      required
                      placeholder="Nama PIC dari kantor"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !formData.finding.trim()}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFindingForm;
