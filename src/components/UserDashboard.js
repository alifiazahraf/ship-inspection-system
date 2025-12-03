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
    if (user?.id) {
      fetchAssignedShips();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchAssignedShips = async () => {
    if (!user?.id) {
      setShips([]);
      setLoading(false);
      return;
    }

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
    <div className="min-vh-100" style={{ 
      backgroundColor: '#f0f4f8',
      backgroundImage: 'linear-gradient(to bottom, rgba(30, 58, 138, 0.02) 0%, rgba(30, 64, 175, 0.01) 100%)'
    }}>
      {/* Professional Header with Refined Design */}
      <nav
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          padding: '1.125rem 0',
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="container-fluid px-4 d-flex align-items-center justify-content-between">
          {/* Left Side - Logo & Branding */}
          <div className="d-flex align-items-center gap-4">
            {/* Logo Container with Refined Shadow */}
            <div
              style={{
                background: 'white',
                padding: '0.5rem',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)';
              }}
            >
              <img 
                src={logo} 
                alt="Company Logo" 
                style={{ 
                  height: '44px', 
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }} 
              />
            </div>
            
            {/* Vertical Divider */}
            <div style={{
              width: '1px',
              height: '32px',
              background: 'rgba(255, 255, 255, 0.2)',
            }}></div>
            
            {/* Title Section with Better Typography */}
            <div className="d-flex flex-column" style={{ gap: '2px' }}>
              <span className="fw-bold" style={{ 
                fontSize: '1.375rem', 
                color: 'white',
                letterSpacing: '-0.02em',
                lineHeight: '1.3',
              }}>
                User Dashboard
              </span>
              <small style={{ 
                fontSize: '0.8125rem', 
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.01em',
                fontWeight: '400',
              }}>
                Assigned Ships Management
              </small>
            </div>
          </div>
          
          {/* Right Side - User Profile & Actions */}
          <div className="d-flex align-items-center gap-3">
            {/* User Profile with Enhanced Design */}
            <div 
              className="d-flex align-items-center gap-2 px-3 py-2 rounded" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.12)', 
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'white',
                  color: '#1e3a8a',
                  fontSize: '0.9375rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="d-flex flex-column" style={{ gap: '1px' }}>
                <span className="fw-semibold" style={{ 
                  fontSize: '0.875rem', 
                  color: 'white', 
                  lineHeight: '1.3',
                  letterSpacing: '0.01em',
                }}>
                  {user.email}
                </span>
                <small style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: '500',
                }}>
                  User
                </small>
              </div>
            </div>
            
            {/* Logout Button with Refined Design */}
            <button
              onClick={handleLogout}
              className="btn d-flex align-items-center gap-2"
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.625rem 1.125rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#b91c1c';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 6px rgba(220, 38, 38, 0.25)';
              }}
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px' }}>
        <div className="mb-4">
          <h2 className="mb-1" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            Kapal yang Di-assign ke Anda
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>Pilih kapal untuk melihat detail temuan</p>
        </div>
        {selectedShip ? (
          <ShipDetails
            selectedShip={selectedShip}
            onBack={() => setSelectedShip(null)}
            role="user"
            user={user}
          />
        ) : loading ? (
          <div className="text-center py-5" style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '3rem'
          }}>
            <div className="spinner-border" role="status" style={{ color: '#3b82f6', width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3" style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat kapal yang di-assign...</p>
          </div>
        ) : ships.length === 0 ? (
          <div className="text-center py-5" style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '3rem'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <i className="bi bi-ship" style={{ fontSize: '2rem', color: '#94a3b8' }}></i>
            </div>
            <h5 style={{ color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Tidak ada kapal yang di-assign</h5>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Tidak ada kapal yang di-assign ke akun Anda.</p>
          </div>
        ) : (
          <div className="row g-4">
            {ships.map(ship => (
              <div key={ship.id} className="col-md-4">
                <div
                  className="h-100"
                  style={{
                    cursor: 'pointer',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="mb-0" style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a' }}>
                      {ship.ship_name}
                    </h5>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#1e40af',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: '1px solid #bfdbfe'
                    }}>
                      {ship.ship_code}
                    </span>
                  </div>
                  <div className="d-flex align-items-center pt-3 border-top" style={{ color: '#64748b' }}>
                    <i className="bi bi-calendar-check me-2" style={{ fontSize: '0.875rem' }}></i>
                    <small style={{ fontSize: '0.75rem' }}>
                      Last Inspection: {ship.last_inspection ? new Date(ship.last_inspection).toLocaleDateString() : 'Belum ada inspeksi'}
                    </small>
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
