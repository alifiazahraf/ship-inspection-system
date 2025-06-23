import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ShipDetails from './ShipDetails';
import logo from '../assets/images/gls-logo.png';
import { logShipActivity, ACTIVITY_TYPES } from '../utils/logging';

const UserDashboard = ({ user, handleLogout }) => {
  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedShip, setSelectedShip] = useState(null);

  useEffect(() => {
    fetchAssignedShips();
    // eslint-disable-next-line
  }, [user.id]);

  const fetchAssignedShips = async () => {
    setLoading(true);
    try {
      const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('ship_id')
        .eq('user_id', user.id);

      if (assignError) throw assignError;

      const shipIds = assignments.map(a => a.ship_id);

      if (shipIds.length === 0) {
        setShips([]);
        setLoading(false);
        return;
      }

      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*')
        .in('id', shipIds);

      if (shipsError) throw shipsError;

      setShips(shipsData);
    } catch (error) {
      console.error('Error fetching assigned ships:', error);
      setShips([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav
        className="shadow-sm"
        style={{
          background: 'linear-gradient(90deg, #1857b7 0%, #0ea5e9 100%)',
          padding: '0.75rem 0',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="container-fluid px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <img 
              src={logo} 
              alt="Company Logo" 
              style={{ 
                height: '50px', 
                marginRight: '1rem',
                objectFit: 'contain',
                backgroundColor: 'white',
                padding: '0.5rem',
                // borderRadius: '0.5rem',
              }} 
            />
            <span className="fw-bold fs-4 text-white">User Dashboard</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-white fw-medium me-2">{user.email}</span>
            <span
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
              }}
            >
              <i className="bi bi-person fs-4 text-white"></i>
            </span>
            <button
              onClick={handleLogout}
              className="btn d-flex align-items-center fw-semibold"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.5rem 1.25rem',
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginLeft: '1rem',
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-main">
        <h2 className="my-4">Kapal yang Di-assign ke Anda</h2>
        {selectedShip ? (
          <ShipDetails
            selectedShip={selectedShip}
            onBack={() => setSelectedShip(null)}
            role="user"
            user={user}
          />
        ) : loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : ships.length === 0 ? (
          <div className="alert alert-info">
            <p>Tidak ada kapal yang di-assign ke akun Anda.</p>
          </div>
        ) : (
          <div className="row g-4">
            {ships.map(ship => (
              <div key={ship.id} className="col-md-4">
                <div
                  className="card h-100 ship-card"
                  style={{
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => {
                    setSelectedShip(ship);
                    // Log ship selection activity
                    logShipActivity(
                      user,
                      ACTIVITY_TYPES.VIEW,
                      `User melihat detail kapal: ${ship.ship_name}`,
                      ship
                    );
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#1857b7'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title text-dark fw-bold mb-0">{ship.ship_name}</h5>
                      <span className="badge bg-light text-dark p-2">
                        {ship.ship_code}
                      </span>
                    </div>
                    <div className="d-flex align-items-center text-muted">
                      <i className="bi bi-calendar-check me-2"></i>
                      <small>
                        Last Inspection: {new Date(ship.last_inspection).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
