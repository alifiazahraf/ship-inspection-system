import React from 'react';

const ShipHeader = ({ 
  ship, 
  findingsCount, 
  latestInspectionDate, 
  assignedUser, 
  loading, 
  loadingUser 
}) => {
  return (
    <div className="card mb-4" style={{ border: '1px solid #dee2e6', padding: '24px' }}>
      <div className="card-body p-0">
        <div className="row">
          <h4 className="mb-3">{ship.ship_name}</h4>
          <div className="col-md-2">
            <h6 className="text-muted">Kode Kapal</h6>
            <p className="fw-bold fs-5 mb-0">{ship.ship_code}</p>
          </div>
          <div className="col-md-2">
            <h6 className="text-muted">Inspeksi Terakhir</h6>
            <p className="fw-bold fs-5 mb-0">
              {latestInspectionDate 
                ? new Date(latestInspectionDate).toLocaleDateString('id-ID')
                : 'Belum ada'
              }
            </p>
          </div>
          <div className="col-md-2">
            <h6 className="text-muted">Total Temuan</h6>
            <p className="fw-bold fs-5 mb-0">{loading ? '...' : `${findingsCount}`}</p>
          </div>
          <div className="col-md-5">
            <h6 className="text-muted">User di-assign</h6>
            <p className="fw-bold fs-5 mb-0">
              {loadingUser ? '...' : (assignedUser ? assignedUser.email : 'Belum di-assign')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipHeader; 