import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const EditFindingForm = ({ finding, onFindingEdited, onCancel }) => {
  const [formData, setFormData] = useState({
    finding: finding.finding,
    picShip: finding.pic_ship,
    picOffice: finding.pic_office,
    category: finding.category,
    status: finding.status
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

  const uploadPhoto = async (file) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${finding.ship_id}/before_${Date.now()}.${fileExt}`;
    const filePath = `findings/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('finding-images')
        .upload(filePath, file);

      if (error) throw error;

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
      let beforePhotoUrl = finding.before_photo;
      if (beforePhoto) {
        beforePhotoUrl = await uploadPhoto(beforePhoto);
      }

      const { error } = await supabase
        .from('findings')
        .update({
          finding: formData.finding,
          category: formData.category,
          status: formData.status,
          pic_ship: formData.picShip,
          pic_office: formData.picOffice,
          before_photo: beforePhotoUrl
        })
        .eq('id', finding.id);

      if (error) {
        setError(error.message);
        toast.error('Gagal mengupdate temuan: ' + error.message);
      } else {
        toast.success('Temuan berhasil diupdate!');
        onFindingEdited();
      }
    } catch (error) {
      setError('Error updating finding: ' + error.message);
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Temuan #{finding.no}</h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={loading}></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
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
                <div className="col-md-6">
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

              {(beforePhoto || finding.before_photo) && (
                <div className="mb-3">
                  <label className="form-label">Preview Foto Before:</label>
                  <div className="border rounded p-2">
                    <img 
                      src={beforePhoto ? URL.createObjectURL(beforePhoto) : finding.before_photo} 
                      alt="Preview" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
                    />
                    {beforePhoto && (
                      <small className="text-muted d-block mt-1">
                        File: {beforePhoto.name} ({(beforePhoto.size / 1024 / 1024).toFixed(2)} MB)
                      </small>
                    )}
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
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
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

export default EditFindingForm; 