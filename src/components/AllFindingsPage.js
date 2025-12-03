import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './common/LoadingSpinner';
import { ToastContainer, toast } from 'react-toastify';
import { getPhotoCount, getFirstPhotoUrl, parsePhotoUrls } from '../utils/photoUtils';
import * as XLSX from 'xlsx';
import logo from '../assets/images/gls-logo.png';
import 'react-toastify/dist/ReactToastify.css';

const AllFindingsPage = ({ user, handleLogout }) => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShip, setSelectedShip] = useState('');
  const [ships, setShips] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState({ step: '', progress: 0 });
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
      return <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>;
    }

    const photoUrls = parsePhotoUrls(photoString);
    const photoCount = getPhotoCount(photoString);
    const firstPhotoUrl = getFirstPhotoUrl(photoString);

    if (photoCount === 0) {
      return <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>;
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
              width: '56px',
              height: '56px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              transition: 'all 0.2s'
            }}
            onClick={() => openPhotoGallery(photoUrls, 0, `${type} - Finding #${findingId}`)}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.transform = 'scale(1)';
            }}
          />
          {photoCount > 1 && (
            <span 
              className="position-absolute top-0 end-0"
              style={{
                fontSize: '0.65rem',
                transform: 'translate(50%, -50%)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.125rem 0.375rem',
                borderRadius: '10px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              +{photoCount - 1}
            </span>
          )}
        </div>
        {photoCount > 1 && (
          <button
            className="btn"
            onClick={() => openPhotoGallery(photoUrls, 0, `${type} - Finding #${findingId}`)}
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#3b82f6',
              borderRadius: '6px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#eff6ff';
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            Lihat ({photoCount})
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

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    setExcelProgress({ step: 'Memulai...', progress: 0 });
    
    try {
      // Show processing message
      toast.info('Menyiapkan data Excel, mohon tunggu...', {
        position: "top-center",
        autoClose: 2000
      });

      setExcelProgress({ step: 'Menyiapkan data dengan format baru...', progress: 25 });

      // Prepare data following the requested survey format
      const currentYear = new Date().getFullYear();
      const sheetData = [
        [`SURVEI RUTIN - ${currentYear}`, '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['NO', 'Tanggal', `MV. KAPAL`, 'Deskripsi Temuan', 'PIC', '', 'KATEGORI', 'STATUS', 'COMMENT'],
        ['', '', '', '', "Vessel's", 'Office', '', '', '']
      ];

      // Use filteredFindings for export with sequential numbering
      filteredFindings.forEach((finding, index) => {
        sheetData.push([
          index + 1, // Sequential number starting from 1
          finding.date ? new Date(finding.date).toLocaleDateString('id-ID') : '', // Tanggal
          finding.ships?.ship_name || '', // Nama kapal (MV. sudah di header)
          finding.finding || '', // Deskripsi temuan
          finding.pic_ship || '', // PIC Vessel's
          finding.pic_office || '', // PIC Office
          finding.category || '', // Kategori
          finding.status || '', // Status
          finding.vessel_comment || '' // Comment
        ]);
      });

      setExcelProgress({ step: 'Membuat workbook...', progress: 45 });

      // Create workbook and worksheet with custom layout
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Define merges to match the survey layout
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title row (9 columns)
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // NO header merge
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // Tanggal header merge
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // MV. KAPAL header merge
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, // Deskripsi Temuan header merge
        { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } }, // PIC merge
        { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } }, // KATEGORI merge
        { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } }, // STATUS merge
        { s: { r: 2, c: 8 }, e: { r: 3, c: 8 } }  // COMMENT merge
      ];

      // Set column widths to resemble the reference table
      ws['!cols'] = [
        { wch: 6 },   // NO
        { wch: 12 },  // Tanggal
        { wch: 20 },  // MV. KAPAL (nama kapal)
        { wch: 40 },  // Deskripsi Temuan
        { wch: 14 },  // PIC Vessel
        { wch: 18 },  // PIC Office
        { wch: 12 },  // Kategori
        { wch: 12 },  // Status
        { wch: 28 }   // Comment
      ];

      const borderStyle = { style: 'thin', color: { rgb: '000000' } };
      const headerFill = { fgColor: { rgb: 'FFF2B2' } };
      const titleStyle = {
        font: { bold: true, sz: 18, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      const headerStyle = {
        font: { bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: headerFill,
        border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
      };
      const subHeaderStyle = {
        font: { bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'FFE699' } },
        border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
      };
      const centerCellStyle = {
        alignment: { horizontal: 'center', vertical: 'top', wrapText: true },
        border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
      };
      const leftCellStyle = {
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
        border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
      };

      const ensureCell = (address) => {
        if (!ws[address]) {
          ws[address] = { t: 's', v: '' };
        }
      };

      ensureCell('A1');
      ws['A1'].s = titleStyle;

      // Main header cells (row 3)
      ['A3', 'B3', 'C3', 'D3', 'G3', 'H3', 'I3'].forEach((address) => {
        ensureCell(address);
        ws[address].s = headerStyle;
      });
      // PIC subheader cells (row 3)
      ['E3', 'F3'].forEach((address) => {
        ensureCell(address);
        ws[address].s = headerStyle; // PIC header uses headerStyle
      });
      // PIC subheader cells (row 4)
      ['E4', 'F4'].forEach((address) => {
        ensureCell(address);
        ws[address].s = subHeaderStyle;
      });

      // Apply border and alignment styles to the header merged cells' bottom row
      ['A4', 'B4', 'C4', 'D4', 'G4', 'H4', 'I4'].forEach((address) => {
        ensureCell(address);
        ws[address].s = headerStyle;
      });

      // Style data rows
      const dataStartRow = 4;
      for (let r = dataStartRow; r < sheetData.length; r++) {
        for (let c = 0; c < 9; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          ensureCell(cellAddress);
          // Column C (MV. KAPAL), D (Deskripsi Temuan), and I (COMMENT) are left-aligned
          if (c === 2 || c === 3 || c === 8) {
            ws[cellAddress].s = leftCellStyle;
          } else {
            ws[cellAddress].s = centerCellStyle;
          }
        }
      }

      setExcelProgress({ step: 'Menambahkan informasi...', progress: 70 });

      // Additional information worksheet
      const infoData = [
        ['Total Temuan', filteredFindings.length],
        ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
        ['User', user?.email || 'Unknown']
      ];
      const infoWs = XLSX.utils.aoa_to_sheet(infoData);
      infoWs['!cols'] = [{ wch: 20 }, { wch: 30 }];

      // Apply simple styling for the information sheet
      const infoBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };
      for (let r = 0; r < infoData.length; r++) {
        for (let c = 0; c < infoData[r].length; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          if (!infoWs[cellAddress]) {
            infoWs[cellAddress] = { t: 's', v: '' };
          }
          infoWs[cellAddress].s = {
            font: { bold: c === 0 },
            alignment: { horizontal: c === 0 ? 'left' : 'left', vertical: 'center' },
            border: infoBorder
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'SURVEI RUTIN');
      XLSX.utils.book_append_sheet(wb, infoWs, 'Informasi');

      setExcelProgress({ step: 'Menyimpan file...', progress: 90 });

      // Generate filename
      const fileName = `Laporan_Semua_Temuan_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save the Excel file
      XLSX.writeFile(wb, fileName);
      
      setExcelProgress({ step: 'Excel berhasil dibuat!', progress: 100 });
      toast.success('File Excel berhasil diunduh!');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Terjadi kesalahan saat membuat Excel');
      setExcelProgress({ step: 'Error!', progress: 0 });
    } finally {
      setTimeout(() => {
        setDownloadingExcel(false);
        setExcelProgress({ step: '', progress: 0 });
      }, 1000);
    }
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
                  Daftar Temuan
                </span>
                <small style={{ 
                  fontSize: '0.8125rem', 
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.01em',
                  fontWeight: '400',
                }}>
                  All Findings Management
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

        {/* Content */}
        <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px' }}>
          {/* Header Section */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn d-flex align-items-center justify-content-center"
                onClick={() => navigate('/dashboard')}
                title="Kembali ke Dashboard"
                style={{ 
                  width: '44px', 
                  height: '44px',
                  borderRadius: '10px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.color = '#475569';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.color = '#64748b';
                }}
              >
                <i className="bi bi-arrow-left fs-6"></i>
              </button>
              <div>
                <h2 className="mb-1" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                  Daftar Semua Temuan
                </h2>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge" style={{ 
                    background: '#e0f2fe', 
                    color: '#0369a1',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.75rem',
                    fontWeight: '500'
                  }}>
                    {filteredFindings.length} temuan
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                    dari {findings.length} total data
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters - Modern Design */}
          <div className="mb-4" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <div className="row g-3">
              {/* Search Field */}
              <div className="col-md-6">
                <label className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  <i className="bi bi-search me-1"></i>
                  Cari Temuan
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
                    placeholder="Cari temuan, kapal, kategori, PIC, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      paddingLeft: '2.5rem',
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
                </div>
              </div>
              
              {/* Ship Filter */}
              <div className="col-md-2">
                <label className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  <i className="bi bi-ship me-1"></i>
                  Kapal
                </label>
                <select
                  className="form-select"
                  value={selectedShip}
                  onChange={(e) => setSelectedShip(e.target.value)}
                  style={{
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
                >
                  <option value="">Semua Kapal</option>
                  {ships.map(ship => (
                    <option key={ship.id} value={ship.id}>
                      {ship.ship_name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date Sort */}
              <div className="col-md-2">
                <label className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Urutkan
                </label>
                <button
                  className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleDateSort}
                  title={`Urutkan tanggal ${sortOrder === 'desc' ? 'terbaru ke terlama' : 'terlama ke terbaru'}`}
                    style={{
                      border: `1px solid ${sortOrder === 'desc' ? '#1e3a8a' : '#e2e8f0'}`,
                      background: sortOrder === 'desc' ? '#1e3a8a' : 'white',
                      color: sortOrder === 'desc' ? 'white' : '#475569',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      padding: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  onMouseEnter={(e) => {
                    if (sortOrder !== 'desc') {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortOrder !== 'desc') {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  <i className={`bi bi-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>
                  <span className="d-none d-lg-inline">
                    {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
                  </span>
                </button>
              </div>

              {/* Download Excel */}
              <div className="col-md-2">
                <label className="form-label mb-2" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                  Export
                </label>
                <button 
                  className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleDownloadExcel}
                  disabled={loading || downloadingExcel || filteredFindings.length === 0}
                  title="Download Excel"
                  style={{
                    border: '1px solid #1e40af',
                    background: '#1e40af',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    padding: '0.5rem',
                    transition: 'all 0.2s',
                    opacity: (loading || downloadingExcel || filteredFindings.length === 0) ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !downloadingExcel && filteredFindings.length > 0) {
                      e.target.style.background = '#1e3a8a';
                      e.target.style.borderColor = '#1e3a8a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !downloadingExcel && filteredFindings.length > 0) {
                      e.target.style.background = '#1e40af';
                      e.target.style.borderColor = '#1e40af';
                    }
                  }}
                >
                  {downloadingExcel ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem' }}></span>
                      <div className="d-flex flex-column align-items-start ms-2">
                        <small style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>{excelProgress.step}</small>
                        {excelProgress.progress > 0 && (
                          <div className="progress mt-1" style={{ width: '60px', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)' }}>
                            <div 
                              className="progress-bar bg-white" 
                              style={{ width: `${excelProgress.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-file-earmark-excel"></i>
                      <span className="d-none d-lg-inline">Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
              
            {/* Filter Summary */}
            {(searchTerm || selectedShip) && (
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <small className="text-muted fw-medium" style={{ fontSize: '0.75rem' }}>Filter aktif:</small>
                  {searchTerm && (
                    <span className="badge d-flex align-items-center gap-1" style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      <i className="bi bi-search"></i>
                      "{searchTerm}"
                      <button
                        className="btn-close"
                        onClick={() => setSearchTerm('')}
                        style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}
                      ></button>
                    </span>
                  )}
                  {selectedShip && (
                    <span className="badge d-flex align-items-center gap-1" style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      <i className="bi bi-ship"></i>
                      {ships.find(ship => ship.id.toString() === selectedShip)?.ship_name}
                      <button
                        className="btn-close"
                        onClick={() => setSelectedShip('')}
                        style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}
                      ></button>
                    </span>
                  )}
                  <button
                    className="btn btn-link p-0"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedShip('');
                    }}
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#475569'}
                    onMouseLeave={(e) => e.target.style.color = '#64748b'}
                  >
                    Bersihkan semua
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table - Modern Design */}
          <div className="card" style={{
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}>
            <div className="card-header" style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderBottom: '2px solid #bfdbfe',
              borderRadius: '12px 12px 0 0',
              padding: '1rem 1.5rem',
            }}>
              <h6 className="mb-0 fw-semibold" style={{ color: '#1e40af' }}>
                <i className="bi bi-list-ul me-2"></i>
                Daftar Semua Temuan ({filteredFindings.length} temuan)
              </h6>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <LoadingSpinner text="Memuat data temuan..." />
                </div>
              ) : filteredFindings.length === 0 ? (
                <div className="text-center py-5 px-4">
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
                    <i className="bi bi-inbox" style={{ fontSize: '2rem', color: '#94a3b8' }}></i>
                  </div>
                  <h5 style={{ color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Tidak ada temuan</h5>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                    {searchTerm || selectedShip 
                      ? 'Tidak ada temuan yang sesuai dengan filter'
                      : 'Belum ada data temuan'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                <table className="table mb-0" style={{ margin: 0 }}>
                  <thead style={{ 
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderBottom: '2px solid #bfdbfe',
                  }}>
                    <tr>
                      <th style={{ 
                        width: '50px', 
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                        textAlign: 'center',
                      }}>#</th>
                      <th 
                        style={{ 
                          width: '120px', 
                          cursor: 'pointer',
                          padding: '1rem 0.75rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#1e40af',
                          borderBottom: 'none',
                        }}
                        onClick={handleDateSort}
                        className="user-select-none"
                        title="Klik untuk mengurutkan tanggal"
                        onMouseEnter={(e) => e.target.style.color = '#1e3a8a'}
                        onMouseLeave={(e) => e.target.style.color = '#1e40af'}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <span>Tanggal</span>
                          <i className={`bi bi-sort-${sortOrder === 'desc' ? 'down' : 'up'}`} style={{ color: '#1e3a8a' }}></i>
                        </div>
                      </th>
                      <th style={{ 
                        width: '150px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Kapal</th>
                      <th style={{ 
                        width: '250px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Deskripsi Temuan</th>
                      <th style={{ 
                        width: '100px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Kategori</th>
                      <th style={{ 
                        width: '120px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>PIC Kapal</th>
                      <th style={{ 
                        width: '120px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>PIC Kantor</th>
                      <th style={{ 
                        width: '80px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Status</th>
                      <th style={{ 
                        width: '120px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Foto Before</th>
                      <th style={{ 
                        width: '120px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Foto After</th>
                      <th style={{ 
                        width: '200px',
                        padding: '1rem 0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        borderBottom: 'none',
                      }}>Vessel Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((finding, index) => (
                      <tr 
                        key={finding.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td className="text-center" style={{ padding: '1rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {index + 1}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>
                            {formatDate(finding.date)}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>
                              {finding.ships?.ship_name}
                            </div>
                            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {finding.ships?.ship_code}
                            </small>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ 
                            maxWidth: '250px', 
                            wordWrap: 'break-word',
                            fontSize: '0.875rem',
                            color: '#334155',
                            lineHeight: '1.5'
                          }}>
                            {finding.finding}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0'
                          }}>
                            {finding.category}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div 
                            style={{ 
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              color: '#334155'
                            }}
                            title={finding.pic_ship}
                          >
                            {finding.pic_ship || (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div 
                            style={{ 
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              color: '#334155'
                            }}
                            title={finding.pic_office}
                          >
                            {finding.pic_office || (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </div>
                        </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: finding.status === 'Open' ? '#fee2e2' : '#d1fae5',
                              color: finding.status === 'Open' ? '#991b1b' : '#065f46',
                              border: `1px solid ${finding.status === 'Open' ? '#fecaca' : '#a7f3d0'}`
                            }}>
                              {finding.status}
                            </span>
                          </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <PhotoCell 
                            photoString={finding.before_photo} 
                            type="Before"
                            findingId={finding.id}
                          />
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <PhotoCell 
                            photoString={finding.after_photo} 
                            type="After"
                            findingId={finding.id}
                          />
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ 
                            maxWidth: '200px', 
                            wordWrap: 'break-word',
                            fontSize: '0.875rem',
                            color: '#334155',
                            lineHeight: '1.5'
                          }}>
                            {finding.vessel_comment || (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum ada komentar</span>
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

      {/* Photo Gallery Modal - Modern Design */}
      {photoGallery.isOpen && (
        <div 
          className="modal d-block" 
          style={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 1060
          }}
          onClick={closePhotoGallery}
        >
          <div 
            className="modal-dialog modal-xl modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-transparent border-0">
              <div className="modal-header border-0 d-flex align-items-center justify-content-between pb-3">
                <h5 className="modal-title text-white mb-0" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                  {photoGallery.title}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closePhotoGallery}
                  style={{ opacity: 0.8 }}
                ></button>
              </div>
              <div className="modal-body p-0 text-center">
                <div className="position-relative">
                  <img
                    src={photoGallery.photos[photoGallery.currentIndex]}
                    alt={`View ${photoGallery.currentIndex + 1}`}
                    className="img-fluid"
                    style={{ 
                      maxHeight: '75vh',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                  
                  {photoGallery.photos.length > 1 && (
                    <>
                      <button
                        className="btn position-absolute top-50 start-0 translate-middle-y ms-4"
                        style={{ 
                          zIndex: 1,
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                        onClick={prevPhoto}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className="bi bi-chevron-left" style={{ fontSize: '1.25rem', color: '#1e293b' }}></i>
                      </button>
                      <button
                        className="btn position-absolute top-50 end-0 translate-middle-y me-4"
                        style={{ 
                          zIndex: 1,
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                        onClick={nextPhoto}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className="bi bi-chevron-right" style={{ fontSize: '1.25rem', color: '#1e293b' }}></i>
                      </button>
                    </>
                  )}
                </div>
              </div>
              {photoGallery.photos.length > 1 && (
                <div className="modal-footer border-0 justify-content-center flex-column pt-4">
                  <div className="d-flex gap-2 flex-wrap justify-content-center mb-3">
                    {photoGallery.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: '64px',
                          height: '64px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          border: index === photoGallery.currentIndex ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.3)',
                          opacity: index === photoGallery.currentIndex ? 1 : 0.6,
                          transition: 'all 0.2s'
                        }}
                        onClick={() => goToPhoto(index)}
                        onMouseEnter={(e) => {
                          if (index !== photoGallery.currentIndex) {
                            e.target.style.opacity = '0.8';
                            e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (index !== photoGallery.currentIndex) {
                            e.target.style.opacity = '0.6';
                            e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-white">
                    <span style={{
                      display: 'inline-block',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
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