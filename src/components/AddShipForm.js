import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const AddShipForm = ({ onShipAdded, onCancel }) => {
  const [shipName, setShipName] = useState('');
  const [shipCode, setShipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('ships')
        .insert([{ 
          ship_name: shipName, 
          ship_code: shipCode,
          last_inspection: new Date().toISOString()
        }]);

      if (error) {
        setError(error.message);
      } else {
        setShipName('');
        setShipCode('');
        onShipAdded(); // Call without parameters since we'll fetch fresh data
      }
    } catch (error) {
      setError('Error adding ship: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tambah Kapal Baru</h5>
            <button 
              type="button" 
              className="btn-close"
              onClick={onCancel}
              disabled={loading}
            ></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="shipName" className="form-label">Nama Kapal *</label>
                <input
                  type="text"
                  className="form-control"
                  id="shipName"
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  required
                  placeholder="Contoh: MV Sinar Harapan"
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="shipCode" className="form-label">Kode Kapal *</label>
                <input
                  type="text"
                  className="form-control"
                  id="shipCode"
                  value={shipCode}
                  onChange={(e) => setShipCode(e.target.value)}
                  required
                  placeholder="Contoh: SH-001"
                  disabled={loading}
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
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

export default AddShipForm;
