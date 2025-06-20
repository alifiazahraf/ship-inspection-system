import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ShipDetails from './ShipDetails';
import AddShipForm from './AddShipForm';
import AssignUserToShip from './AssignUserToShip';
import { ToastContainer, toast } from 'react-toastify';
import logo from '../assets/images/gls-logo.png';
import 'react-toastify/dist/ReactToastify.css';

const AdminDashboard = ({ user, handleLogout }) => {
  const [ships, setShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddShipForm, setShowAddShipForm] = useState(false);
  const [showAddFindingForm, setShowAddFindingForm] = useState(false);
  const [findings, setFindings] = useState([]);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);

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

      // Process ships to include latest inspection date
      const processedShips = shipsData.map(ship => {
        const shipFindings = findingsData.filter(f => f.ship_id === ship.id);
        if (shipFindings.length > 0) {
          const latestDate = shipFindings.reduce((latest, finding) => {
            return finding.date > latest ? finding.date : latest;
          }, shipFindings[0].date);
          return { ...ship, last_inspection: latestDate };
        }
        return ship;
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
          {selectedShip ? (
            <ShipDetails
              selectedShip={selectedShip}
              onBack={() => setSelectedShip(null)}
              showAddForm={showAddFindingForm}
              setShowAddForm={setShowAddFindingForm}
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
                  {ships.map(ship => (
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
          )}
        </div>
        </div>
    </>
  );
};

export default AdminDashboard;
