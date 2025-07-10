import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import { 
  FINDING_CATEGORIES, 
  FINDING_STATUSES, 
  PIC_SHIP_OPTIONS, 
  PIC_OFFICE_OPTIONS,
  DEFAULT_CATEGORY,
  DEFAULT_STATUS
} from '../constants/findingData';
import { uploadMultiplePhotos, serializePhotoUrls } from '../utils/photoUtils';
import PhotoPreview from './findings/PhotoPreview';

const AddFindingForm = ({ selectedShip, onFindingAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    finding: '',
    picShip: '',
    picOffice: '',
    category: DEFAULT_CATEGORY,
    status: DEFAULT_STATUS,
    date: new Date().toISOString().split('T')[0]
  });
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBeforePhotosChange = (e) => {
    const files = Array.from(e.target.files);
    setBeforePhotos(prev => [...prev, ...files]);
  };

  const removeBeforePhoto = (index) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload before photos if exist
      let beforePhotoUrls = [];
      if (beforePhotos.length > 0) {
        beforePhotoUrls = await uploadMultiplePhotos(beforePhotos, selectedShip.id, 'before', supabase);
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
          before_photo: serializePhotoUrls(beforePhotoUrls),
          after_photo: '', // Empty string for new findings
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
          category: DEFAULT_CATEGORY,
          status: DEFAULT_STATUS,
          date: new Date().toISOString().split('T')[0]
        });
        setBeforePhotos([]);
        toast.success('Temuan berhasil ditambahkan!');
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
                      {FINDING_CATEGORIES.map(cat => (
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
                      {FINDING_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Foto Before</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  multiple
                  onChange={handleBeforePhotosChange}
                  disabled={loading}
                />
                <div className="form-text">
                  Format: JPG, PNG, GIF. Max: 5MB per file. Pilih multiple files dengan Ctrl/Cmd+Click
                </div>
              </div>

              {/* Photo Preview */}
              <PhotoPreview 
                photos={beforePhotos}
                label="Preview Foto Before"
                onRemovePhoto={removeBeforePhoto}
              />

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
                    <select
                      className="form-select"
                      name="picShip"
                      value={formData.picShip}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Pilih PIC Kapal</option>
                      {PIC_SHIP_OPTIONS.map(pic => (
                        <option key={pic} value={pic}>{pic}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">PIC Kantor *</label>
                    <select
                      className="form-select"
                      name="picOffice"
                      value={formData.picOffice}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Pilih PIC Kantor</option>
                      {PIC_OFFICE_OPTIONS.map(pic => (
                        <option key={pic} value={pic}>{pic}</option>
                      ))}
                    </select>
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
