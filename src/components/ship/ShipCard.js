import React from 'react';

const ShipCard = ({ ship, onSelect, loading = false }) => {
  const handleClick = () => {
    if (!loading) {
      onSelect(ship);
    }
  };

  return (
    <div 
      className={`card mb-3 ${loading ? 'opacity-50' : 'hover-shadow'}`}
      style={{ 
        cursor: loading ? 'not-allowed' : 'pointer',
        border: '1px solid #dee2e6',
        transition: 'all 0.2s ease-in-out'
      }}
      onClick={handleClick}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{ship.ship_name}</h5>
          <small className="text-muted">{ship.ship_code}</small>
        </div>
        
        <div className="row">
          <div className="col-md-6">
            <small className="text-muted">Inspeksi Terakhir:</small>
            <p className="mb-1 fw-bold">
              {ship.last_inspection 
                ? new Date(ship.last_inspection).toLocaleDateString('id-ID')
                : 'Belum ada'
              }
            </p>
          </div>
          <div className="col-md-6">
            <small className="text-muted">Status:</small>
            <p className="mb-0">
              <span className={`badge ${ship.last_inspection ? 'bg-success' : 'bg-warning'}`}>
                {ship.last_inspection ? 'Sudah Inspeksi' : 'Belum Inspeksi'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipCard; 