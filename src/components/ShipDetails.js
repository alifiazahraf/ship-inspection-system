import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AddFindingForm from './AddFindingForm';
import EditFindingForm from './EditFindingForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logFindingActivity, logShipActivity, ACTIVITY_TYPES } from '../utils/logging';
import { debugUser } from '../utils/debug';

const ShipDetails = ({ selectedShip, onBack, showAddForm, setShowAddForm, role = 'admin', user }) => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedUser, setAssignedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [latestInspectionDate, setLatestInspectionDate] = useState(selectedShip.last_inspection);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showDeleteAfterModal, setShowDeleteAfterModal] = useState(false);
  const [findingToDeleteAfter, setFindingToDeleteAfter] = useState(null);

  const fetchShipData = async () => {
    setLoading(true);
    setLoadingUser(true);

    const fetchFindingsPromise = supabase
      .from('findings')
      .select('*')
      .eq('ship_id', selectedShip.id)
      .order('no', { ascending: true });

    const fetchUserPromise = supabase
      .from('assignments')
      .select('user_id')
      .eq('ship_id', selectedShip.id)
      .limit(1)
      .single();

    try {
      const [findingsResult, assignmentResult] = await Promise.all([fetchFindingsPromise, fetchUserPromise]);

      if (findingsResult.error) {
        toast.error('Gagal memuat data temuan');
      } else {
        setFindings(findingsResult.data);
        if (findingsResult.data && findingsResult.data.length > 0) {
          const latestDate = findingsResult.data.reduce((latest, finding) => {
            return finding.date > latest ? finding.date : latest;
          }, findingsResult.data[0].date);
          setLatestInspectionDate(latestDate);
        }
      }

      if (!assignmentResult.error && assignmentResult.data) {
        const { data: userData, error: userError } = await supabase
          .from('user_list')
          .select('email')
          .eq('id', assignmentResult.data.user_id)
          .single();
        
        if (!userError) {
          setAssignedUser(userData);
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat data kapal.');
    } finally {
      setLoading(false);
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchShipData();
    // eslint-disable-next-line
  }, [selectedShip.id]);
  
  const handleFindingAdded = async () => {
    setShowAddForm(false);
    toast.success('Temuan berhasil ditambahkan!');
    await fetchShipData();
    
    // Log finding creation activity
    if (user) {
      // Debug user object
      debugUser(user, 'handleFindingAdded');
      
      logFindingActivity(
        user,
        ACTIVITY_TYPES.CREATE,
        `Menambahkan temuan baru pada kapal: ${selectedShip.ship_name}`,
        null,
        selectedShip
      );
    }
  };

  const handleUploadAfterPhoto = async (finding) => {
    setSelectedFinding(finding);
    setShowUploadModal(true);
  };

  const handleSubmitAfterPhoto = async () => {
    if (!afterPhoto) return;
    setUploading(true);
    const fileExt = afterPhoto.name.split('.').pop();
    const fileName = `${selectedShip.id}/after_${Date.now()}.${fileExt}`;
    const filePath = `findings/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('finding-images')
      .upload(filePath, afterPhoto);

    if (uploadError) {
      toast.error('Gagal upload foto.');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('finding-images')
      .getPublicUrl(filePath);

    await supabase.from('findings').update({ after_photo: publicUrl }).eq('id', selectedFinding.id);
    
    setShowUploadModal(false);
    setAfterPhoto(null);
    setSelectedFinding(null);
    setUploading(false);
    toast.success('Foto after berhasil diupload!');
    fetchShipData();
    
    // Log after photo upload activity
    if (user) {
      // Debug user object
      debugUser(user, 'handleSubmitAfterPhoto');
      
      logFindingActivity(
        user,
        ACTIVITY_TYPES.UPDATE,
        `Mengupload foto after untuk temuan No.${selectedFinding.no} pada kapal: ${selectedShip.ship_name}`,
        selectedFinding,
        selectedShip,
        { ...selectedFinding, after_photo: null }, // old_data
        { ...selectedFinding, after_photo: publicUrl } // new_data
      );
    }
  };

  const handleEditFinding = (finding) => {
    setSelectedFinding(finding);
    setShowEditForm(true);
  };

  const handleFindingEdited = async () => {
    setShowEditForm(false);
    await fetchShipData();
    
    // Log finding edit activity
    if (user) {
      logFindingActivity(
        user,
        ACTIVITY_TYPES.UPDATE,
        `Mengedit temuan No.${selectedFinding.no} pada kapal: ${selectedShip.ship_name}`,
        selectedFinding,
        selectedShip
      );
    }
  };

  const handleDeleteFinding = async (finding) => {
    // Create custom confirm dialog
    toast.warn(
      <div className="text-center">
        <p className="mb-3">Apakah Anda yakin ingin menghapus temuan ini?</p>
        <div className="d-flex justify-content-center gap-1">
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => toast.dismiss()}
          >
            Batal
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={async () => {
              toast.dismiss();
              try {
                const { error } = await supabase
                  .from('findings')
                  .delete()
                  .eq('id', finding.id);

                if (error) {
                  toast.error('Gagal menghapus temuan: ' + error.message);
                } else {
                  toast.success('Temuan berhasil dihapus!');
                  await fetchShipData();
                  
                  // Log finding deletion activity
                  if (user) {
                    logFindingActivity(
                      user,
                      ACTIVITY_TYPES.DELETE,
                      `Menghapus temuan No.${finding.no}: ${finding.finding} pada kapal: ${selectedShip.ship_name}`,
                      finding,
                      selectedShip,
                      finding // old_data
                    );
                  }
                }
              } catch (error) {
                toast.error('Terjadi kesalahan saat menghapus temuan');
              }
            }}
          >
            Ya, Hapus
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className: 'bg-white'
      }
    );
  };

  const handleDeleteAfterPhoto = async (finding) => {
    console.log('handleDeleteAfterPhoto called:', finding);
    setFindingToDeleteAfter(finding);
    setShowDeleteAfterModal(true);
  };

  const confirmDeleteAfterPhoto = async () => {
    if (!findingToDeleteAfter) return;
    
    try {
      const { error } = await supabase
        .from('findings')
        .update({ after_photo: null })
        .eq('id', findingToDeleteAfter.id);

      if (error) {
        toast.error('Gagal menghapus foto after: ' + error.message);
      } else {
        toast.success('Foto after berhasil dihapus!');
        await fetchShipData();
        
        // Log after photo deletion activity
        if (user) {
          // Debug user object
          debugUser(user, 'confirmDeleteAfterPhoto');
          
          logFindingActivity(
            user,
            ACTIVITY_TYPES.UPDATE,
            `Menghapus foto after untuk temuan No.${findingToDeleteAfter.no} pada kapal: ${selectedShip.ship_name}`,
            findingToDeleteAfter,
            selectedShip,
            { ...findingToDeleteAfter }, // old_data
            { ...findingToDeleteAfter, after_photo: null } // new_data
          );
        }
      }
    } catch (error) {
      console.error('Error deleting after photo:', error);
      toast.error('Terjadi kesalahan saat menghapus foto after');
    } finally {
      setShowDeleteAfterModal(false);
      setFindingToDeleteAfter(null);
    }
  };

  // Helper function to convert image URL to base64 with compression
  const getBase64FromImageUrl = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize image to smaller dimensions for PDF
        const maxWidth = 300;
        const maxHeight = 200;
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use lower quality for smaller file size (0.3 = 30% quality)
        const dataURL = canvas.toDataURL('image/jpeg', 0.3);
        resolve(dataURL);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    
    try {
      // Show optimization message
      toast.info('Mengoptimasi gambar untuk PDF, mohon tunggu...', {
        position: "top-center",
        autoClose: 2000
      });

      // Create new PDF document in landscape orientation with compression
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
        compress: true // Enable PDF compression
      });
      
      // Set document title and metadata
      doc.setProperties({
        title: `Laporan Temuan - ${selectedShip.ship_name}`,
        subject: 'Laporan Temuan Inspeksi Kapal',
        author: 'Ship Inspection System',
        creator: 'Ship Inspection System'
      });

      // Add header with ship information
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN TEMUAN INSPEKSI KAPAL', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
      
      // Ship details section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const shipInfoY = 90;
      doc.text(`Nama Kapal: ${selectedShip.ship_name}`, 50, shipInfoY);
      doc.text(`Inspeksi Terakhir: ${new Date(latestInspectionDate).toLocaleDateString('id-ID')}`, 300, shipInfoY);
      doc.text(`Kode Kapal: ${selectedShip.ship_code}`, 550, shipInfoY);
      
      doc.text(`Total Temuan: ${findings.length}`, 50, shipInfoY + 20);
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 300, shipInfoY + 20);
      doc.text(`User: ${assignedUser ? assignedUser.email : 'Belum di-assign'}`, 550, shipInfoY + 20);

      // Add a line separator
      doc.setLineWidth(1);
      doc.line(50, shipInfoY + 40, doc.internal.pageSize.getWidth() - 50, shipInfoY + 40);

      // Prepare table data
      const tableColumns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal', dataKey: 'date' },
        { header: 'Temuan', dataKey: 'finding' },
        { header: 'Kategori', dataKey: 'category' },
        { header: 'PIC Kapal', dataKey: 'pic_ship' },
        { header: 'PIC Kantor', dataKey: 'pic_office' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Foto Before', dataKey: 'before_photo' },
        { header: 'Foto After', dataKey: 'after_photo' }
      ];

      // Preload all images and convert to base64
      const imagePromises = [];
      findings.forEach(finding => {
        if (finding.before_photo) {
          imagePromises.push(getBase64FromImageUrl(finding.before_photo));
        } else {
          imagePromises.push(Promise.resolve(null));
        }
        if (finding.after_photo) {
          imagePromises.push(getBase64FromImageUrl(finding.after_photo));
        } else {
          imagePromises.push(Promise.resolve(null));
        }
      });

      const images = await Promise.all(imagePromises);
      
      const tableRows = findings.map((finding, index) => ({
        no: finding.no,
        date: new Date(finding.date).toLocaleDateString('id-ID'),
        finding: finding.finding,
        category: finding.category,
        pic_ship: finding.pic_ship,
        pic_office: finding.pic_office,
        status: finding.status,
        before_photo: finding.before_photo,
        after_photo: finding.after_photo,
        before_image_data: images[index * 2],
        after_image_data: images[index * 2 + 1]
      }));

      // Configure table styles with adjusted column widths
      const tableOptions = {
        startY: shipInfoY + 60,
        head: [tableColumns.map(col => col.header)],
        body: tableRows.map(row => tableColumns.map(col => {
          if (col.dataKey === 'before_photo' || col.dataKey === 'after_photo') {
            return row[col.dataKey] ? '' : 'Tidak Ada'; // Empty string for images, will be handled by didDrawCell
          }
          return row[col.dataKey];
        })),
        theme: 'striped',
        headStyles: {
          fillColor: [52, 144, 220],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
          minCellHeight: 40
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'center' }, // No
          1: { cellWidth: 65, halign: 'center' }, // Date
          2: { cellWidth: 200, halign: 'left' },  // Finding - kurangi sedikit
          3: { cellWidth: 80, halign: 'center' }, // Category
          4: { cellWidth: 80, halign: 'center' }, // PIC Ship
          5: { cellWidth: 80, halign: 'center' }, // PIC Office
          6: { cellWidth: 55, halign: 'center' }, // Status
          7: { cellWidth: 80, halign: 'center' }, // Before Photo
          8: { cellWidth: 80, halign: 'center' }  // After Photo
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        margin: { left: 25, right: 25 },
        showHead: 'everyPage',
        didDrawCell: function (data) {
          if (data.column.index === 7 && data.cell.section === 'body') { // Before Photo column
            const rowIndex = data.row.index;
            if (tableRows[rowIndex] && tableRows[rowIndex].before_image_data) {
              const imageData = tableRows[rowIndex].before_image_data;
              try {
                doc.addImage(imageData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 50, 35);
              } catch (e) {
                // If image fails to load, show text instead
                doc.setFontSize(8);
                doc.text('Ada', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
              }
            }
          }
          if (data.column.index === 8 && data.cell.section === 'body') { // After Photo column
            const rowIndex = data.row.index;
            if (tableRows[rowIndex] && tableRows[rowIndex].after_image_data) {
              const imageData = tableRows[rowIndex].after_image_data;
              try {
                doc.addImage(imageData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 50, 35);
              } catch (e) {
                // If image fails to load, show text instead
                doc.setFontSize(8);
                doc.text('Ada', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
              }
            }
          }
        }
      };

      // Add table to PDF
      autoTable(doc, tableOptions);

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 30,
          { align: 'center' }
        );
        doc.text(
          `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
          doc.internal.pageSize.getWidth() - 50,
          doc.internal.pageSize.getHeight() - 30,
          { align: 'right' }
        );
      }

      // Generate filename with ship name and current date
      const fileName = `Laporan_Temuan_${selectedShip.ship_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      doc.save(fileName);
      toast.success('PDF berhasil didownload!');
      
      // Log PDF download activity
      if (user) {
        logShipActivity(
          user,
          ACTIVITY_TYPES.VIEW,
          `Download laporan PDF kapal: ${selectedShip.ship_name} (${findings.length} temuan)`,
          selectedShip
        );
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Terjadi kesalahan saat membuat PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            className="btn btn-outline-secondary d-flex align-items-center" 
            onClick={onBack}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Kembali
          </button>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success d-flex align-items-center"
            onClick={handleDownloadPDF}
            disabled={loading || loadingUser || findings.length === 0 || downloadingPDF}
            title={
              loading || loadingUser ? "Sedang memuat data..." :
              findings.length === 0 ? "Tidak ada temuan untuk didownload" : 
              downloadingPDF ? "Sedang membuat PDF..." :
              "Download laporan temuan sebagai PDF"
            }
          >
            {downloadingPDF ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Membuat PDF...
              </>
            ) : (
              <>
                <i className="bi bi-download me-2"></i>
                Download PDF
              </>
            )}
          </button>
          {role === 'admin' && (
            <button 
              className="btn btn-primary d-flex align-items-center"
              onClick={() => setShowAddForm(true)}
              disabled={loading}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Tambah Temuan Baru
            </button>
          )}
        </div>
      </div>

      <div className="card mb-4" style={{ border: '1px solid #dee2e6', padding: '24px' }}>
        <div className="card-body p-0">
          <div className="row">
            <h4 className="mb-3">{selectedShip.ship_name}</h4>
            <div className="col-md-2">
              <h6 className="text-muted">Kode Kapal</h6>
              <p className="fw-bold fs-5 mb-0">{selectedShip.ship_code}</p>
            </div>
            <div className="col-md-2">
              <h6 className="text-muted">Inspeksi Terakhir</h6>
              <p className="fw-bold fs-5 mb-0">{new Date(latestInspectionDate).toLocaleDateString()}</p>
            </div>
            <div className="col-md-2">
              <h6 className="text-muted">Total Temuan</h6>
              <p className="fw-bold fs-5 mb-0">{loading ? '...' : `${findings.length}`}</p>
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
      
      {showAddForm && (
        <AddFindingForm
          selectedShip={selectedShip}
          onFindingAdded={handleFindingAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="card" style={{ border: '1px solid #dee2e6', padding: '24px' }}>
        <div className="card-header bg-white py-3">
          <h5 className="mb-0">Daftar Temuan</h5>
        </div>
        <div className="card-body p-0 bg-white">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th scope="col" className="text-center">No</th>
                    <th scope="col">Date</th>
                    <th scope="col">Finding</th>
                    <th scope="col">Category</th>
                    <th scope="col">PIC Kapal</th>
                    <th scope="col">PIC Kantor</th>
                    <th scope="col">Status</th>
                    <th scope="col">Foto Before</th>
                    <th scope="col">Foto After</th>
                    {role === 'admin' && <th scope="col" className="text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {findings.length > 0 ? (
                    findings.map((finding) => (
                      <tr key={finding.id}>
                        <td className="text-center"><span className="badge bg-primary rounded-pill">{finding.no}</span></td>
                        <td>{new Date(finding.date).toLocaleDateString()}</td>
                        <td className="fw-medium">{finding.finding}</td>
                        <td>{finding.category}</td>
                        <td>{finding.pic_ship}</td>
                        <td>{finding.pic_office}</td>
                        <td>
                          <span className={`badge ${ finding.status === 'Open' ? 'bg-danger' : 'bg-success' }`}>
                            {finding.status}
                          </span>
                        </td>
                        <td>
                          {finding.before_photo ? (
                            <div style={{ cursor: 'pointer' }} onClick={() => setSelectedImage(finding.before_photo)}>
                              <img 
                                src={finding.before_photo} 
                                alt="Before" 
                                style={{ 
                                  height: '170px', 
                                  width: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }} 
                              />
                            </div>
                          ) : <span className="text-muted">-</span>}
                        </td>
                        <td>
                          {finding.after_photo ? (
                            <div style={{ position: 'relative', cursor: 'pointer' }}>
                              <img 
                                src={finding.after_photo} 
                                alt="After" 
                                style={{ 
                                  height: '170px', 
                                  width: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }} 
                                onClick={() => setSelectedImage(finding.after_photo)}
                              />
                              <div className="position-absolute top-0 end-0 m-1 d-flex flex-column gap-1">
                                <button 
                                  className="btn btn-sm btn-warning"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUploadAfterPhoto(finding);
                                  }}
                                  title="Edit foto after"
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAfterPhoto(finding);
                                  }}
                                  title="Hapus foto after"
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button className="btn btn-sm btn-primary" onClick={() => handleUploadAfterPhoto(finding)}>
                              <i className="bi bi-camera me-1"></i>Add
                            </button>
                          )}
                        </td>
                        {role === 'admin' && (
                          <td className="text-center">
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => handleEditFinding(finding)}
                              >
                                <i className="bi bi-pencil me-1"></i>
                                Edit
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteFinding(finding)}
                              >
                                <i className="bi bi-trash me-1"></i>
                                Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                          Belum ada temuan inspeksi
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {selectedImage && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Preview Foto</h5><button type="button" className="btn-close" onClick={() => setSelectedImage(null)}></button></div>
              <div className="modal-body p-0"><img src={selectedImage} alt="Finding Preview" className="img-fluid w-100" style={{ maxHeight: '80vh', objectFit: 'contain' }} /></div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Upload Foto After</h5><button type="button" className="btn-close" onClick={() => setShowUploadModal(false)}></button></div>
              <div className="modal-body">
                <input type="file" className="form-control" accept="image/*" onChange={e => setAfterPhoto(e.target.files[0])} />
                {afterPhoto && <img src={URL.createObjectURL(afterPhoto)} alt="Preview" className="img-fluid mt-2" style={{ maxHeight: 200 }} />}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Batal</button>
                <button className="btn btn-success" onClick={handleSubmitAfterPhoto} disabled={uploading || !afterPhoto}>{uploading ? 'Uploading...' : 'Upload Foto'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditForm && selectedFinding && (
        <EditFindingForm
          finding={selectedFinding}
          onFindingEdited={handleFindingEdited}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* Delete After Photo Modal */}
      {showDeleteAfterModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Konfirmasi Hapus Foto After</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteAfterModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Apakah Anda yakin ingin menghapus foto after ini?</p>
                <p className="text-muted small">Aksi ini tidak dapat dibatalkan.</p>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteAfterModal(false)}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={confirmDeleteAfterPhoto}
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShipDetails;
