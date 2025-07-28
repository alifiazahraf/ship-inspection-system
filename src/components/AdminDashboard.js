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
      <div className="min-vh-100 bg-light">
        <nav
          className="shadow-sm"
          style={{
            background: 'linear-gradient(90deg, #1857b7 0%, #0ea5e9 100%)',
            // borderRadius: '0 0 1.5rem 1.5rem',
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
              <span className="fw-bold fs-4 text-white">Admin Dashboard</span>
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
        <div className="container-main py-4">
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
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h2 className="h4 mb-1">Pilih Kapal untuk Inspeksi</h2>
                  <p className="text-muted mb-0">Pilih kapal yang akan diinspeksi</p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success d-flex align-items-center"
                    onClick={() => window.location.href = '/daftar-temuan'}
                    disabled={loading}
                  >
                    <i className="bi bi-list-ul me-2"></i>
                    Daftar Temuan
                  </button>
                  <button
                    className="btn btn-info d-flex align-items-center"
                    onClick={() => setShowActivityLogs(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-clock-history me-2"></i>
                    Activity Logs
                  </button>
                  <button
                    className="btn btn-secondary d-flex align-items-center"
                    onClick={() => setShowAssignUserModal(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Assign User
                  </button>
                  <button 
                    className="btn btn-primary d-flex align-items-center"
                    onClick={() => setShowAddShipForm(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Tambah Kapal
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

              {/* Ship Count and Search */}
              {!loading && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <h6 className="mb-0 text-muted">Total Kapal:</h6>
                      <span className="badge bg-primary fs-6 px-3 py-2">{ships.length}</span>
                      {searchTerm && (
                        <>
                          <span className="text-muted">|</span>
                          <h6 className="mb-0 text-muted">Hasil Pencarian:</h6>
                          <span className="badge bg-secondary fs-6 px-3 py-2">{filteredShips.length}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="Cari kapal berdasarkan nama atau kode..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ boxShadow: 'none' }}
                        />
                        {searchTerm && (
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setSearchTerm('')}
                          >
                            <i className="bi bi-x"></i>
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
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Memuat daftar kapal...</p>
                </div>
              ) : (
                <div className="row g-4">
                  {filteredShips.length > 0 ? (
                    filteredShips.map(ship => (
                      <div key={ship.id} className="col-md-4">
                        <div 
                          className="card h-100 ship-card"
                          onClick={() => handleShipSelect(ship)}
                          style={{
                            cursor: 'pointer',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
                            transition: 'border-color 0.2s',
                          }}
                          onMouseOver={e => e.currentTarget.style.borderColor = '#1857b7'}
                          onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <h5 className="card-title text-dark fw-bold mb-0">{ship.ship_name}</h5>
                              <span className="badge bg-light text-dark p-2">{ship.ship_code}</span>
                            </div>
                            
                            {/* NC Status */}
                            <div className="row mb-3">
                              <div className="col-6">
                                <div className="d-flex align-items-center">
                                  <div className="me-2">
                                    <span className="badge bg-danger text-white px-2 py-1">
                                      {ship.nc_open || 0}
                                    </span>
                                  </div>
                                  <small className="text-muted">NC Open</small>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="d-flex align-items-center">
                                  <div className="me-2">
                                    <span className="badge bg-success text-white px-2 py-1">
                                      {ship.nc_closed || 0}
                                    </span>
                                  </div>
                                  <small className="text-muted">NC Closed</small>
                                </div>
                              </div>
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center text-muted">
                                <i className="bi bi-calendar-check me-2"></i>
                                <small>
                                  Last Inspection: {ship.last_inspection ? new Date(ship.last_inspection).toLocaleDateString() : 'Belum ada inspeksi'}
                                </small>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="btn-group">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={(e) => handleEditShip(ship, e)}
                                  title="Edit kapal"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={(e) => handleDeleteShip(ship, e)}
                                  title="Hapus kapal"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12">
                      <div className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-search fs-1 d-block mb-3"></i>
                          {searchTerm ? (
                            <>
                              <h5>Tidak ada kapal yang ditemukan</h5>
                              <p>Tidak ada kapal yang cocok dengan pencarian "<strong>{searchTerm}</strong>"</p>
                              <button 
                                className="btn btn-primary"
                                onClick={() => setSearchTerm('')}
                              >
                                Tampilkan Semua Kapal
                              </button>
                            </>
                          ) : (
                            <>
                              <h5>Belum ada kapal yang terdaftar</h5>
                              <p>Mulai dengan menambahkan kapal baru</p>
                            </>
                          )}
                        </div>
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
