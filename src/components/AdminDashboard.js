import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ShipDetails from './ShipDetails';
import AddShipForm from './AddShipForm';
import EditShipForm from './EditShipForm';
import AssignUserToShip from './AssignUserToShip';
import ActivityLogs from './ActivityLogs';
import { ToastContainer, toast } from 'react-toastify';
import logo from '../assets/images/gls-logo.png';
import 'react-toastify/dist/ReactToastify.css';
import { logShipActivity, ACTIVITY_TYPES } from '../utils/logging';

const AdminDashboard = ({ user, handleLogout }) => {
  const [ships, setShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddShipForm, setShowAddShipForm] = useState(false);
  const [showEditShipForm, setShowEditShipForm] = useState(false);
  const [editingShip, setEditingShip] = useState(null);
  const [showAddFindingForm, setShowAddFindingForm] = useState(false);
  const [findings, setFindings] = useState([]);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    ship: null,
    deleting: false
  });

  const fetchShips = async () => {
    setLoading(true);
    try {
      const { data: shipsData, error: shipsError } = await supabase
        .from('ships')
        .select('*');

      if (shipsError) {
        console.error('Error fetching ships:', shipsError);
        toast.error('Gagal memuat data kapal');
        return;
      }

      // Fetch all findings
      const { data: findingsData, error: findingsError } = await supabase
        .from('findings')
        .select('*');

      if (findingsError) {
        console.error('Error fetching findings:', findingsError);
        toast.error('Gagal memuat data temuan');
        return;
      }

      // Process ships to include latest inspection date and NC counts
      const processedShips = shipsData.map(ship => {
        const shipFindings = findingsData.filter(f => f.ship_id === ship.id);
        // Count NC Open and NC Closed
        const ncOpen = shipFindings.filter(f => f.status === 'Open' || f.status === 'open').length;
        const ncClosed = shipFindings.filter(f => f.status === 'Closed' || f.status === 'closed').length;
        
        if (shipFindings.length > 0) {
          const latestDate = shipFindings.reduce((latest, finding) => {
            return finding.date > latest ? finding.date : latest;
          }, shipFindings[0].date);
          return { 
            ...ship, 
            last_inspection: latestDate,
            nc_open: ncOpen,
            nc_closed: ncClosed
          };
        }
        return { 
          ...ship, 
          nc_open: ncOpen,
          nc_closed: ncClosed
        };
      });

      setShips(processedShips);
    } catch (error) {
      console.error('Unexpected error fetching ships:', error);
      toast.error('Terjadi kesalahan saat memuat data kapal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShips();
  }, []);

  const fetchFindings = async (shipId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('findings')
        .select('*')
        .eq('ship_id', shipId);

      if (error) {
        console.error('Error fetching findings:', error);
      } else {
        setFindings(data);
        console.log(findings);
      }
    } catch (error) {
      console.error('Unexpected error fetching findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShipSelect = (ship) => {
    setSelectedShip(ship);
    fetchFindings(ship.id);
    
    // Log ship selection activity
    logShipActivity(
      user, 
      ACTIVITY_TYPES.VIEW, 
      `Melihat detail kapal: ${ship.ship_name}`, 
      ship
    );
  };

  const handleShipAdded = async () => {
    setShowAddShipForm(false);
    toast.success('Kapal berhasil ditambahkan!', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    await fetchShips();
  };

  const handleEditShip = (ship, event) => {
    event.stopPropagation(); // Prevent card click
    setEditingShip(ship);
    setShowEditShipForm(true);
    
    // Log ship edit activity
    logShipActivity(
      user,
      ACTIVITY_TYPES.UPDATE,
      `Membuka form edit kapal: ${ship.ship_name}`,
      ship
    );
  };

  const handleShipEdited = async () => {
    setShowEditShipForm(false);
    setEditingShip(null);
    await fetchShips();
  };

  const checkCanDeleteShip = async (ship) => {
    try {
      // Check if ship has assigned users
      const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('id')
        .eq('ship_id', ship.id)
        .limit(1);

      if (assignError) throw assignError;

      // Check if ship has findings
      const { data: findings, error: findingsError } = await supabase
        .from('findings')
        .select('id')
        .eq('ship_id', ship.id)
        .limit(1);

      if (findingsError) throw findingsError;

      return {
        canDelete: assignments.length === 0 && findings.length === 0,
        hasAssignments: assignments.length > 0,
        hasFindings: findings.length > 0
      };
    } catch (error) {
      console.error('Error checking ship deletion eligibility:', error);
      toast.error('Gagal memeriksa status kapal');
      return { canDelete: false, hasAssignments: false, hasFindings: false };
    }
  };

  const handleDeleteShip = async (ship, event) => {
    event.stopPropagation(); // Prevent card click
    
    const { canDelete, hasAssignments, hasFindings } = await checkCanDeleteShip(ship);
    
    if (!canDelete) {
      let message = 'Kapal tidak dapat dihapus karena:\n';
      if (hasAssignments) message += '• Masih ada user yang di-assign ke kapal ini\n';
      if (hasFindings) message += '• Masih ada temuan inspeksi di kapal ini\n';
      message += '\nHapus terlebih dahulu data terkait sebelum menghapus kapal.';
      
      toast.warn(message, {
        position: "top-center",
        autoClose: 5000,
        style: { whiteSpace: 'pre-line' }
      });
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      ship: ship,
      deleting: false
    });
  };

  const confirmDeleteShip = async () => {
    setDeleteConfirmation(prev => ({ ...prev, deleting: true }));
    
    try {
      const { error } = await supabase
        .from('ships')
        .delete()
        .eq('id', deleteConfirmation.ship.id);

      if (error) throw error;

      toast.success(`Kapal ${deleteConfirmation.ship.ship_name} berhasil dihapus!`);
      
      // Log ship deletion activity
      logShipActivity(
        user,
        ACTIVITY_TYPES.DELETE,
        `Menghapus kapal: ${deleteConfirmation.ship.ship_name} (${deleteConfirmation.ship.ship_code})`,
        deleteConfirmation.ship
      );
      
      await fetchShips();
    } catch (error) {
      console.error('Error deleting ship:', error);
      toast.error('Gagal menghapus kapal: ' + error.message);
    } finally {
      setDeleteConfirmation({
        isOpen: false,
        ship: null,
        deleting: false
      });
    }
  };

  const cancelDeleteShip = () => {
    setDeleteConfirmation({
      isOpen: false,
      ship: null,
      deleting: false
    });
  };

  // Filter ships based on search term
  const filteredShips = ships.filter(ship => 
    ship.ship_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ship.ship_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
    <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
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
                  Admin Dashboard
                </span>
                <small style={{ 
                  fontSize: '0.8125rem', 
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.01em',
                  fontWeight: '400',
                }}>
                  Ship Management System
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
                    Admin
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
          {showActivityLogs ? (
            <ActivityLogs onBack={() => setShowActivityLogs(false)} />
          ) : selectedShip ? (
            <ShipDetails
              selectedShip={selectedShip}
              onBack={() => setSelectedShip(null)}
              showAddForm={showAddFindingForm}
              setShowAddForm={setShowAddFindingForm}
              user={user}
            />
          ) : (
            <div>
              {/* Header Section */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h2 className="mb-1" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                    Pilih Kapal untuk Inspeksi
                  </h2>
                  <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>Pilih kapal yang akan diinspeksi</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn d-flex align-items-center gap-2"
                    onClick={() => window.location.href = '/daftar-temuan'}
                    disabled={loading}
                    style={{
                      background: '#1e40af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = '#1e3a8a';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.background = '#1e40af';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <i className="bi bi-list-ul"></i>
                    <span>Daftar Temuan</span>
                  </button>
                  <button
                    className="btn d-flex align-items-center gap-2"
                    onClick={() => setShowActivityLogs(true)}
                    disabled={loading}
                    style={{
                      background: 'white',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = '#eff6ff';
                        e.target.style.borderColor = '#1e40af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#bfdbfe';
                      }
                    }}
                  >
                    <i className="bi bi-clock-history"></i>
                    <span>Activity Logs</span>
                  </button>
                  <button
                    className="btn d-flex align-items-center gap-2"
                    onClick={() => setShowAssignUserModal(true)}
                    disabled={loading}
                    style={{
                      background: 'white',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <i className="bi bi-person-plus"></i>
                    <span>Assign User</span>
                  </button>
                  <button 
                    className="btn d-flex align-items-center gap-2"
                    onClick={() => setShowAddShipForm(true)}
                    disabled={loading}
                    style={{
                      background: '#1e3a8a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.background = '#1e40af';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.background = '#1e3a8a';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <i className="bi bi-plus-circle"></i>
                    <span>Tambah Kapal</span>
                  </button>
                </div>
              </div>

              {showAddShipForm && (
                <AddShipForm
                  onShipAdded={handleShipAdded}
                  onCancel={() => setShowAddShipForm(false)}
                />
              )}

              {showEditShipForm && editingShip && (
                <EditShipForm
                  ship={editingShip}
                  onShipEdited={handleShipEdited}
                  onCancel={() => {
                    setShowEditShipForm(false);
                    setEditingShip(null);
                  }}
                />
              )}

              {/* Search Section */}
              {!loading && (
                <div className="mb-4" style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0'
                }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Total Kapal:</h6>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>{ships.length}</span>
                      </div>
                      {searchTerm && (
                        <>
                          <span className="text-muted">|</span>
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="mb-0" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Hasil Pencarian:</h6>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              color: '#475569',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>{filteredShips.length}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                        <i className="bi bi-search me-1"></i>
                        Cari Kapal
                      </label>
                      <div className="position-relative">
                        <i className="bi bi-search position-absolute" style={{
                          left: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                          fontSize: '0.875rem',
                          zIndex: 1
                        }}></i>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cari kapal berdasarkan nama atau kode..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{
                            paddingLeft: '2.5rem',
                            paddingRight: searchTerm ? '2.5rem' : '1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        {searchTerm && (
                          <button
                            className="btn position-absolute"
                            type="button"
                            onClick={() => setSearchTerm('')}
                            style={{
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              padding: '0.25rem',
                              fontSize: '0.875rem',
                              zIndex: 1
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#64748b'}
                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Assign User */}
              {showAssignUserModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Assign User ke Kapal</h5>
                        <button type="button" className="btn-close" onClick={() => setShowAssignUserModal(false)}></button>
                      </div>
                      <div className="modal-body">
                        <AssignUserToShip />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-5" style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '3rem'
                }}>
                  <div className="spinner-border" role="status" style={{ color: '#3b82f6', width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3" style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat daftar kapal...</p>
                </div>
              ) : (
                <div className="row g-4">
                  {filteredShips.length > 0 ? (
                    filteredShips.map(ship => (
                      <div key={ship.id} className="col-md-4">
                        <div 
                          className="h-100"
                          onClick={() => handleShipSelect(ship)}
                          style={{
                            cursor: 'pointer',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
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
                          
                          {/* NC Status */}
                          <div className="row mb-3">
                            <div className="col-6">
                              <div className="d-flex align-items-center gap-2">
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.625rem',
                                  borderRadius: '6px',
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  border: '1px solid #dc2626'
                                }}>
                                  {ship.nc_open || 0}
                                </span>
                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>NC Open</small>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="d-flex align-items-center gap-2">
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.625rem',
                                  borderRadius: '6px',
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  border: '1px solid #a7f3d0'
                                }}>
                                  {ship.nc_closed || 0}
                                </span>
                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>NC Closed</small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                            <div className="d-flex align-items-center" style={{ color: '#64748b' }}>
                              <i className="bi bi-calendar-check me-2" style={{ fontSize: '0.875rem' }}></i>
                              <small style={{ fontSize: '0.75rem' }}>
                                {ship.last_inspection ? new Date(ship.last_inspection).toLocaleDateString() : 'Belum ada inspeksi'}
                              </small>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="d-flex gap-1">
                              <button
                                className="btn"
                                onClick={(e) => handleEditShip(ship, e)}
                                title="Edit kapal"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.5rem',
                                  background: '#eff6ff',
                                  color: '#1e40af',
                                  border: '1px solid #1e40af',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s',
                                  minWidth: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#1e40af';
                                  e.target.style.color = 'white';
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = '0 2px 4px rgba(30, 64, 175, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = '#eff6ff';
                                  e.target.style.color = '#1e40af';
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn"
                                onClick={(e) => handleDeleteShip(ship, e)}
                                title="Hapus kapal"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.5rem',
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  border: '1px solid #dc2626',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s',
                                  minWidth: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#dc2626';
                                  e.target.style.color = 'white';
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = '#fef2f2';
                                  e.target.style.color = '#991b1b';
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12">
                      <div className="text-center py-5" style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0'
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
                          <i className={`bi ${searchTerm ? 'bi-search' : 'bi-ship'}`} style={{ fontSize: '2rem', color: '#94a3b8' }}></i>
                        </div>
                        {searchTerm ? (
                          <>
                            <h5 style={{ color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Tidak ada kapal yang ditemukan</h5>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                              Tidak ada kapal yang cocok dengan pencarian "<strong>{searchTerm}</strong>"
                            </p>
                            <button 
                              className="btn"
                              onClick={() => setSearchTerm('')}
                              style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem 1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                              }}
                            >
                              Tampilkan Semua Kapal
                            </button>
                          </>
                        ) : (
                          <>
                            <h5 style={{ color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Belum ada kapal yang terdaftar</h5>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Mulai dengan menambahkan kapal baru</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delete Ship Confirmation Modal */}
          {deleteConfirmation.isOpen && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header border-danger">
                    <h5 className="modal-title text-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Konfirmasi Hapus Kapal
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={cancelDeleteShip}
                      disabled={deleteConfirmation.deleting}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="d-flex align-items-start">
                      <div className="flex-shrink-0 me-3">
                        <div 
                          className="d-flex align-items-center justify-content-center bg-danger rounded"
                          style={{ width: '50px', height: '50px' }}
                        >
                          <i className="bi bi-ship text-white fs-4"></i>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-2">
                          Apakah Anda yakin ingin menghapus kapal <strong>{deleteConfirmation.ship?.ship_name}</strong> dengan kode <strong>{deleteConfirmation.ship?.ship_code}</strong>?
                        </p>
                        <div className="alert alert-warning py-2 mb-0">
                          <small>
                            <i className="bi bi-info-circle me-1"></i>
                            Kapal yang sudah dihapus tidak dapat dikembalikan. Pastikan tidak ada user yang di-assign dan tidak ada temuan di kapal ini.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={cancelDeleteShip}
                      disabled={deleteConfirmation.deleting}
                    >
                      Batal
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={confirmDeleteShip}
                      disabled={deleteConfirmation.deleting}
                    >
                      {deleteConfirmation.deleting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Menghapus...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash me-1"></i>
                          Ya, Hapus Kapal
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
    </>
  );
};

export default AdminDashboard;
