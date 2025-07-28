import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './common/LoadingSpinner';
import { ToastContainer, toast } from 'react-toastify';
import { getPhotoCount, getFirstPhotoUrl, parsePhotoUrls } from '../utils/photoUtils';
import logo from '../assets/images/gls-logo.png';
import 'react-toastify/dist/ReactToastify.css';

const AllFindingsPage = ({ user, handleLogout }) => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShip, setSelectedShip] = useState('');
  const [ships, setShips] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [photoGallery, setPhotoGallery] = useState({
    isOpen: false,
    photos: [],
    currentIndex: 0,
    title: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllFindings();
    fetchShips();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (photoGallery.isOpen) {
        if (e.key === 'ArrowLeft') {
          prevPhoto();
        } else if (e.key === 'ArrowRight') {
          nextPhoto();
        } else if (e.key === 'Escape') {
          closePhotoGallery();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [photoGallery]);

  const fetchAllFindings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('findings')
        .select(`
          *,
          ships (
            ship_name,
            ship_code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFindings(data || []);
    } catch (error) {
      console.error('Error fetching findings:', error);
      toast.error('Gagal memuat data temuan');
    } finally {
      setLoading(false);
    }
  };

  const fetchShips = async () => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .select('id, ship_name')
        .order('ship_name');

      if (error) throw error;
      setShips(data || []);
    } catch (error) {
      console.error('Error fetching ships:', error);
    }
  };

  const filteredFindings = findings
    .filter(finding => {
      const matchesSearch = 
        finding.finding?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.ships?.ship_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.ships?.ship_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.pic_ship?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.pic_office?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finding.vessel_comment?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesShip = selectedShip === '' || finding.ship_id.toString() === selectedShip;
      
      return matchesSearch && matchesShip;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (sortOrder === 'desc') {
        return dateB - dateA; // Terbaru dulu
      } else {
        return dateA - dateB; // Terlama dulu
      }
    });

  const openPhotoGallery = (photos, startIndex = 0, title = '') => {
    setPhotoGallery({
      isOpen: true,
      photos,
      currentIndex: startIndex,
      title
    });
  };

  const closePhotoGallery = () => {
    setPhotoGallery({
      isOpen: false,
      photos: [],
      currentIndex: 0,
      title: ''
    });
  };

  const nextPhoto = () => {
    setPhotoGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.photos.length
    }));
  };

  const prevPhoto = () => {
    setPhotoGallery(prev => ({
      ...prev,
      currentIndex: prev.currentIndex === 0 ? prev.photos.length - 1 : prev.currentIndex - 1
    }));
  };

  const goToPhoto = (index) => {
    setPhotoGallery(prev => ({
      ...prev,
      currentIndex: index
    }));
  };

  const PhotoCell = ({ photoString, type, findingId }) => {
    if (!photoString) {
      return <span className="text-muted">-</span>;
    }

    const photoUrls = parsePhotoUrls(photoString);
    const photoCount = getPhotoCount(photoString);
    const firstPhotoUrl = getFirstPhotoUrl(photoString);

    if (photoCount === 0) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div className="d-flex align-items-center gap-2">
        <div 
          className="photo-thumbnail position-relative"
          style={{ cursor: 'pointer' }}
        >
          <img
            src={firstPhotoUrl}
            alt={`${type} view`}
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #e3f2fd'
            }}
            onClick={() => openPhotoGallery(photoUrls, 0, `${type} - Finding #${findingId}`)}
          />
          {photoCount > 1 && (
            <span 
              className="position-absolute top-0 end-0 badge bg-primary"
              style={{
                fontSize: '0.7rem',
                transform: 'translate(50%, -50%)'
              }}
            >
              +{photoCount - 1}
            </span>
          )}
        </div>
        {photoCount > 1 && (
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => openPhotoGallery(photoUrls, 0, `${type} - Finding #${findingId}`)}
          >
            Lihat Semua ({photoCount})
          </button>
        )}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDateSort = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
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
        {/* Header */}
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
                }} 
              />
              <span className="fw-bold fs-4 text-white">Daftar Temuan</span>
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

        {/* Content */}
        <div className="container-fluid p-4">
          {/* Header and Back Button */}
          <div className="d-flex align-items-center mb-4">
            <button
              className="btn btn-outline-secondary me-3"
              onClick={() => navigate('/dashboard')}
              title="Kembali ke Dashboard"
              style={{ 
                width: '40px', 
                height: '40px',
                borderRadius: '50%'
              }}
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <div>
              <h2 className="h4 mb-1">Daftar Semua Temuan</h2>
              <p className="text-muted mb-0">
                Total {filteredFindings.length} temuan dari {findings.length} data
              </p>
            </div>
          </div>

                              {/* Search and Filters */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3">
                {/* Search Field */}
                <div className="col-md-7">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Cari temuan, kapal, kategori, PIC, status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </div>
                </div>
                
                {/* Ship Filter */}
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-ship text-muted"></i>
                    </span>
                    <select
                      className="form-select border-start-0"
                      value={selectedShip}
                      onChange={(e) => setSelectedShip(e.target.value)}
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      <option value="">Semua Kapal</option>
                      {ships.map(ship => (
                        <option key={ship.id} value={ship.id}>
                          {ship.ship_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Date Sort */}
                <div className="col-md-2">
                  <button
                    className={`btn w-100 d-flex align-items-center justify-content-center ${
                      sortOrder === 'desc' ? 'btn-primary' : 'btn-outline-primary'
                    }`}
                    onClick={handleDateSort}
                    title={`Urutkan tanggal ${sortOrder === 'desc' ? 'terbaru ke terlama' : 'terlama ke terbaru'}`}
                  >
                    <i className={`bi bi-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>
                    <span className="ms-2 d-none d-lg-inline">
                      {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Filter Summary */}
              {(searchTerm || selectedShip) && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <small className="text-muted">Filter aktif:</small>
                    {searchTerm && (
                      <span className="badge bg-light text-dark border d-flex align-items-center">
                        <i className="bi bi-search me-1"></i>
                        "{searchTerm}"
                        <button
                          className="btn-close btn-close-sm ms-2"
                          onClick={() => setSearchTerm('')}
                          style={{ fontSize: '0.7rem' }}
                        ></button>
                      </span>
                    )}
                    {selectedShip && (
                      <span className="badge bg-light text-dark border d-flex align-items-center">
                        <i className="bi bi-ship me-1"></i>
                        {ships.find(ship => ship.id.toString() === selectedShip)?.ship_name}
                        <button
                          className="btn-close btn-close-sm ms-2"
                          onClick={() => setSelectedShip('')}
                          style={{ fontSize: '0.7rem' }}
                        ></button>
                      </span>
                    )}
                    <button
                      className="btn btn-link btn-sm text-muted p-0"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedShip('');
                      }}
                    >
                      Bersihkan semua
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-sm">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <LoadingSpinner text="Memuat data temuan..." />
                </div>
              ) : filteredFindings.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">Tidak ada temuan</h5>
                  <p className="text-muted">
                    {searchTerm || selectedShip 
                      ? 'Tidak ada temuan yang sesuai dengan filter'
                      : 'Belum ada data temuan'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                                                                                     <thead className="table-light">
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th 
                            style={{ width: '120px', cursor: 'pointer' }}
                            onClick={handleDateSort}
                            className="user-select-none"
                            title="Klik untuk mengurutkan tanggal"
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Tanggal</span>
                              <i className={`bi bi-sort-${sortOrder === 'desc' ? 'down' : 'up'} text-primary`}></i>
                            </div>
                          </th>
                          <th style={{ width: '150px' }}>Kapal</th>
                          <th style={{ width: '250px' }}>Deskripsi Temuan</th>
                          <th style={{ width: '100px' }}>Kategori</th>
                          <th style={{ width: '120px' }}>PIC Kapal</th>
                          <th style={{ width: '120px' }}>PIC Kantor</th>
                          <th style={{ width: '80px' }}>Status</th>
                          <th style={{ width: '120px' }}>Foto Before</th>
                          <th style={{ width: '120px' }}>Foto After</th>
                          <th style={{ width: '200px' }}>Vessel Comment</th>
                        </tr>
                      </thead>
                    <tbody>
                                                                     {filteredFindings.map((finding, index) => (
                          <tr key={finding.id}>
                            <td className="text-center">
                              <span className="badge bg-primary rounded-pill">{index + 1}</span>
                            </td>
                           <td>
                             <small className="text-muted">
                               {formatDate(finding.date)}
                             </small>
                           </td>
                           <td>
                             <div>
                               <div className="fw-semibold">{finding.ships?.ship_name}</div>
                               <small className="text-muted">{finding.ships?.ship_code}</small>
                             </div>
                           </td>
                           <td>
                             <div 
                               style={{ 
                                 maxWidth: '250px',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap'
                               }}
                               title={finding.finding}
                             >
                               {finding.finding}
                             </div>
                           </td>
                           <td>
                             <span className="badge bg-secondary">
                               {finding.category}
                             </span>
                           </td>
                           <td>
                             <div 
                               style={{ 
                                 maxWidth: '120px',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap'
                               }}
                               title={finding.pic_ship}
                             >
                               {finding.pic_ship || (
                                 <span className="text-muted">-</span>
                               )}
                             </div>
                           </td>
                           <td>
                             <div 
                               style={{ 
                                 maxWidth: '120px',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap'
                               }}
                               title={finding.pic_office}
                             >
                               {finding.pic_office || (
                                 <span className="text-muted">-</span>
                               )}
                             </div>
                           </td>
                           <td>
                             <span className={`badge ${finding.status === 'Open' ? 'bg-warning' : 'bg-success'}`}>
                               {finding.status}
                             </span>
                           </td>
                           <td>
                             <PhotoCell 
                               photoString={finding.before_photo} 
                               type="Before"
                               findingId={finding.id}
                             />
                           </td>
                           <td>
                             <PhotoCell 
                               photoString={finding.after_photo} 
                               type="After"
                               findingId={finding.id}
                             />
                           </td>
                           <td>
                             <div 
                               style={{ 
                                 maxWidth: '200px',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap'
                               }}
                               title={finding.vessel_comment}
                             >
                               {finding.vessel_comment || (
                                 <span className="text-muted fst-italic">Belum ada komentar</span>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery Modal */}
      {photoGallery.isOpen && (
        <div 
          className="modal d-block" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1060
          }}
          onClick={closePhotoGallery}
        >
          <div 
            className="modal-dialog modal-xl modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-transparent border-0">
              <div className="modal-header border-0 text-white">
                <h5 className="modal-title">{photoGallery.title}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closePhotoGallery}
                ></button>
              </div>
              <div className="modal-body p-0 text-center">
                <div className="position-relative">
                  <img
                    src={photoGallery.photos[photoGallery.currentIndex]}
                    alt={`View ${photoGallery.currentIndex + 1}`}
                    className="img-fluid"
                    style={{ 
                      maxHeight: '80vh',
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  
                  {photoGallery.photos.length > 1 && (
                    <>
                      <button
                        className="btn btn-light position-absolute top-50 start-0 translate-middle-y ms-3"
                        style={{ zIndex: 1 }}
                        onClick={prevPhoto}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      <button
                        className="btn btn-light position-absolute top-50 end-0 translate-middle-y me-3"
                        style={{ zIndex: 1 }}
                        onClick={nextPhoto}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </>
                  )}
                </div>
              </div>
              {photoGallery.photos.length > 1 && (
                <div className="modal-footer border-0 justify-content-center">
                  <div className="d-flex gap-2 flex-wrap justify-content-center">
                    {photoGallery.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Preview ${index + 1}`}
                        className={`img-thumbnail ${index === photoGallery.currentIndex ? 'border-primary' : ''}`}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          opacity: index === photoGallery.currentIndex ? 1 : 0.6
                        }}
                        onClick={() => goToPhoto(index)}
                      />
                    ))}
                  </div>
                  <div className="text-white mt-2">
                    <span className="badge bg-primary">
                      {photoGallery.currentIndex + 1} / {photoGallery.photos.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllFindingsPage; 