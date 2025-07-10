import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const EditShipForm = ({ ship, onShipEdited, onCancel }) => {
  const [formData, setFormData] = useState({
    ship_name: ship.ship_name,
    ship_code: ship.ship_code
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if ship code already exists (excluding current ship)
      const { data: existingShip, error: checkError } = await supabase
        .from('ships')
        .select('id')
        .eq('ship_code', formData.ship_code)
        .neq('id', ship.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingShip) {
        setError('Kode kapal sudah digunakan oleh kapal lain');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('ships')
        .update({
          ship_name: formData.ship_name.trim(),
          ship_code: formData.ship_code.trim()
        })
        .eq('id', ship.id);

      if (error) {
        setError(error.message);
        toast.error('Gagal mengupdate kapal: ' + error.message);
      } else {
        toast.success('Kapal berhasil diupdate!');
        onShipEdited();
      }
    } catch (error) {
      setError('Error updating ship: ' + error.message);
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Kapal</h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={loading}></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Nama Kapal *</label>
                <input
                  type="text"
                  className="form-control"
                  name="ship_name"
                  value={formData.ship_name}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Masukkan nama kapal"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Kode Kapal *</label>
                <input
                  type="text"
                  className="form-control"
                  name="ship_code"
                  value={formData.ship_code}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Masukkan kode kapal (contoh: KM-001)"
                />
                <div className="form-text">
                  Kode kapal harus unik dan tidak boleh sama dengan kapal lain
                </div>
              </div>

              <div className="modal-footer px-0 pb-0">
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !formData.ship_name.trim() || !formData.ship_code.trim()}>
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

export default EditShipForm; 