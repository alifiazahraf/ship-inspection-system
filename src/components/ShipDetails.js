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
import { 
  getPhotoCount, 
  getFirstPhotoUrl, 
  parsePhotoUrls, 
  addPhotoUrl, 
  uploadMultiplePhotos,
  deletePhotosFromStorage 
} from '../utils/photoUtils';
import { 
  getOptimizedImageForPDF,  
  PDF_IMAGE_CONFIGS 
} from '../utils/imageOptimizer';

const ShipDetails = ({ selectedShip, onBack, showAddForm, setShowAddForm, role = 'admin', user }) => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedUser, setAssignedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [latestInspectionDate, setLatestInspectionDate] = useState(selectedShip.last_inspection);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ step: '', progress: 0 });
  const [showDeleteAfterModal, setShowDeleteAfterModal] = useState(false);
  const [findingToDeleteAfter, setFindingToDeleteAfter] = useState(null);

  
  // Photo gallery modal state
  const [photoGallery, setPhotoGallery] = useState({
    isOpen: false,
    photos: [],
    currentIndex: 0,
    title: ''
  });

  // Photo gallery functions
  const openPhotoGallery = (photoString, type, finding, clickedIndex = 0) => {
    const photos = parsePhotoUrls(photoString);
    setPhotoGallery({
      isOpen: true,
      photos: photos,
      currentIndex: clickedIndex,
      title: `${type === 'before' ? 'Foto Before' : 'Foto After'} - Temuan No.${finding.no} `
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

  // Keyboard navigation for photo gallery
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!photoGallery.isOpen) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          prevPhoto();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextPhoto();
          break;
        case 'Escape':
          event.preventDefault();
          closePhotoGallery();
          break;
        default:
          break;
      }
    };

    if (photoGallery.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [photoGallery.isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleAfterPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    setAfterPhotos(files);
  };

  const handleSubmitAfterPhoto = async () => {
    if (afterPhotos.length === 0) return;
    setUploading(true);
    
    try {
      // Upload multiple photos
      const uploadedUrls = await uploadMultiplePhotos(afterPhotos, selectedShip.id, 'after', supabase);
      
      // Add to existing photos
      const updatedPhotoString = addPhotoUrl(selectedFinding.after_photo, ...uploadedUrls);
      
      const { error } = await supabase
        .from('findings')
        .update({ after_photo: updatedPhotoString })
        .eq('id', selectedFinding.id);

      if (error) throw error;
    
    setShowUploadModal(false);
      setAfterPhotos([]);
    setSelectedFinding(null);
    setUploading(false);
      toast.success(`${uploadedUrls.length} foto after berhasil diupload!`);
    fetchShipData();
    
    // Log after photo upload activity
    if (user) {
      debugUser(user, 'handleSubmitAfterPhoto');
      
      logFindingActivity(
        user,
        ACTIVITY_TYPES.UPDATE,
          `Mengupload ${uploadedUrls.length} foto after untuk temuan No.${selectedFinding.no} pada kapal: ${selectedShip.ship_name}`,
        selectedFinding,
        selectedShip,
          { ...selectedFinding, after_photo: selectedFinding.after_photo }, // old_data
          { ...selectedFinding, after_photo: updatedPhotoString } // new_data
      );
      }
    } catch (error) {
      toast.error('Gagal upload foto: ' + error.message);
      setUploading(false);
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
              try {
                // Delete photos from storage
                const beforePhotoUrls = parsePhotoUrls(finding.before_photo);
                const afterPhotoUrls = parsePhotoUrls(finding.after_photo);
                const allPhotoUrls = [...beforePhotoUrls, ...afterPhotoUrls];
                
                if (allPhotoUrls.length > 0) {
                  await deletePhotosFromStorage(allPhotoUrls, supabase);
                }

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
                    debugUser(user, 'handleDeleteFinding');
                    
                    logFindingActivity(
                      user,
                      ACTIVITY_TYPES.DELETE,
                      `Menghapus temuan No.${finding.no} pada kapal: ${selectedShip.ship_name}`,
                      finding,
                      selectedShip
                    );
                  }
                }
              } catch (error) {
                console.error('Error deleting finding:', error);
                toast.error('Terjadi kesalahan saat menghapus temuan');
              }
              toast.dismiss();
            }}
          >
            Hapus
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: false,
      }
    );
  };

  const handleDeleteAfterPhoto = (finding) => {
    setFindingToDeleteAfter(finding);
    setShowDeleteAfterModal(true);
  };

  const confirmDeleteAfterPhoto = async () => {
    if (!findingToDeleteAfter) return;
    
    try {
      // Delete all after photos from storage
      const afterPhotoUrls = parsePhotoUrls(findingToDeleteAfter.after_photo);
      if (afterPhotoUrls.length > 0) {
        await deletePhotosFromStorage(afterPhotoUrls, supabase);
      }

      const { error } = await supabase
        .from('findings')
        .update({ after_photo: null })
        .eq('id', findingToDeleteAfter.id);

      if (error) {
        toast.error('Gagal menghapus foto after: ' + error.message);
      } else {
        toast.success('Semua foto after berhasil dihapus!');
        await fetchShipData();
        
        // Log after photo deletion activity
        if (user) {
          debugUser(user, 'confirmDeleteAfterPhoto');
          
          logFindingActivity(
            user,
            ACTIVITY_TYPES.UPDATE,
            `Menghapus semua foto after untuk temuan No.${findingToDeleteAfter.no} pada kapal: ${selectedShip.ship_name}`,
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

  // Handle vessel comment update
  const handleUpdateVesselComment = async (findingId, comment) => {
    try {
      const { error } = await supabase
        .from('findings')
        .update({ vessel_comment: comment })
        .eq('id', findingId);

      if (error) {
        throw error;
      }

      toast.success('Komentar berhasil disimpan!');
      
      // Update local state
      setFindings(prevFindings => 
        prevFindings.map(finding => 
          finding.id === findingId 
            ? { ...finding, vessel_comment: comment }
            : finding
        )
      );

      // Log vessel comment activity
      if (user) {
        const finding = findings.find(f => f.id === findingId);
        logFindingActivity(
          user,
          ACTIVITY_TYPES.UPDATE,
          `${comment ? 'Menambah/mengedit' : 'Menghapus'} komentar kapal untuk temuan No.${finding?.no} pada kapal: ${selectedShip.ship_name}`,
          finding,
          selectedShip,
          { ...finding }, // old_data
          { ...finding, vessel_comment: comment } // new_data
        );
      }
    } catch (error) {
      console.error('Error updating vessel comment:', error);
      throw error;
    }
  };

  // Get optimized base64 from image URL for PDF generation
  const getOptimizedBase64FromImageUrl = async (url, config = PDF_IMAGE_CONFIGS.table) => {
    return getOptimizedImageForPDF(url, config);
  };

    const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    setPdfProgress({ step: 'Memulai...', progress: 0 });
    
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
      doc.text(`Inspeksi Terakhir: ${latestInspectionDate ? new Date(latestInspectionDate).toLocaleDateString('id-ID') : 'Belum ada'}`, 300, shipInfoY);
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
        { header: 'Foto After', dataKey: 'after_photo' },
        { header: 'Vessel Comment', dataKey: 'vessel_comment' }
      ];

      // Preload all images and convert to optimized base64
      setPdfProgress({ step: 'Mengoptimasi gambar untuk tabel...', progress: 10 });
      
      const imagePromises = [];
      findings.forEach(finding => {
        const beforeUrl = getFirstPhotoUrl(finding.before_photo);
        const afterUrl = getFirstPhotoUrl(finding.after_photo);
        
        if (beforeUrl) {
          imagePromises.push(getOptimizedBase64FromImageUrl(beforeUrl, PDF_IMAGE_CONFIGS.table));
        } else {
          imagePromises.push(Promise.resolve(null));
        }
        if (afterUrl) {
          imagePromises.push(getOptimizedBase64FromImageUrl(afterUrl, PDF_IMAGE_CONFIGS.table));
        } else {
          imagePromises.push(Promise.resolve(null));
        }
      });

      const images = await Promise.all(imagePromises);
      setPdfProgress({ step: 'Membuat tabel utama...', progress: 30 });
      
      const tableRows = findings.map((finding, index) => {
        const beforeCount = getPhotoCount(finding.before_photo);
        const afterCount = getPhotoCount(finding.after_photo);
        
        return {
          no: finding.no,
          date: new Date(finding.date).toLocaleDateString('id-ID'),
          finding: finding.finding,
          category: finding.category,
          pic_ship: finding.pic_ship,
          pic_office: finding.pic_office,
          status: finding.status,
          vessel_comment: finding.vessel_comment || 'Belum ada komentar',
          before_photo: beforeCount > 0 ? (beforeCount > 1 ? `${beforeCount} foto` : 'Ada') : 'Tidak Ada',
          after_photo: afterCount > 0 ? (afterCount > 1 ? `${afterCount} foto` : 'Ada') : 'Tidak Ada',
          before_image_data: images[index * 2],
          after_image_data: images[index * 2 + 1]
        };
      });

      // Configure table styles with adjusted column widths
      const tableOptions = {
        startY: shipInfoY + 60,
        head: [tableColumns.map(col => col.header)],
        body: tableRows.map(row => tableColumns.map(col => {
          if (col.dataKey === 'before_photo' || col.dataKey === 'after_photo') {
            return row[col.dataKey] === 'Ada' ? '' : row[col.dataKey]; // Empty string for single images, will be handled by didDrawCell
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
          0: { cellWidth: 30, halign: 'center' }, // No
          1: { cellWidth: 55, halign: 'center' }, // Date
          2: { cellWidth: 160, halign: 'left' },  // Finding - kurangi untuk vessel comment
          3: { cellWidth: 70, halign: 'center' }, // Category
          4: { cellWidth: 70, halign: 'center' }, // PIC Ship
          5: { cellWidth: 70, halign: 'center' }, // PIC Office
          6: { cellWidth: 50, halign: 'center' }, // Status
          7: { cellWidth: 70, halign: 'center' }, // Before Photo
          8: { cellWidth: 70, halign: 'center' }, // After Photo
          9: { cellWidth: 120, halign: 'left' }   // Vessel Comment
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
      setPdfProgress({ step: 'Tabel utama selesai...', progress: 50 });

      // Add Photo Detail Section for findings with multiple photos
      const findingsWithMultiplePhotos = findings.filter(finding => 
        getPhotoCount(finding.before_photo) > 1 || getPhotoCount(finding.after_photo) > 1
      );

      if (findingsWithMultiplePhotos.length > 0) {
        setPdfProgress({ step: 'Mengoptimasi gambar detail...', progress: 60 });
        
        // Add new page for photo details
        doc.addPage();
        
        // Detail section header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAIL FOTO TEMUAN', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Kapal: ${selectedShip.ship_name} (${selectedShip.ship_code})`, 50, 75);
        
        // Add line separator
        doc.setLineWidth(0.5);
        doc.line(50, 85, doc.internal.pageSize.getWidth() - 50, 85);

        let currentY = 100;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 50;
        const maxWidth = pageWidth - (margin * 2);

        // Preload all photos for detail section with optimization
        const detailImagePromises = [];
        findingsWithMultiplePhotos.forEach(finding => {
          const beforeUrls = parsePhotoUrls(finding.before_photo);
          const afterUrls = parsePhotoUrls(finding.after_photo);
          
          beforeUrls.forEach(url => detailImagePromises.push(getOptimizedBase64FromImageUrl(url, PDF_IMAGE_CONFIGS.detail)));
          afterUrls.forEach(url => detailImagePromises.push(getOptimizedBase64FromImageUrl(url, PDF_IMAGE_CONFIGS.detail)));
        });

        const detailImages = await Promise.all(detailImagePromises);
        setPdfProgress({ step: 'Menyusun halaman detail...', progress: 80 });
        let imageIndex = 0;

        for (const finding of findingsWithMultiplePhotos) {
          const beforeUrls = parsePhotoUrls(finding.before_photo);
          const afterUrls = parsePhotoUrls(finding.after_photo);
          
          // Check if we need a new page
          if (currentY > pageHeight - 200) {
            doc.addPage();
            currentY = 50;
          }

          // Finding header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`TEMUAN #${finding.no}: ${finding.finding.substring(0, 80)}${finding.finding.length > 80 ? '...' : ''}`, margin, currentY);
          currentY += 20;

          // Before photos section
          if (beforeUrls.length > 1) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`FOTO BEFORE (${beforeUrls.length} foto):`, margin, currentY);
            currentY += 15;

            // Calculate photo layout
            const photoWidth = 120;
            const photoHeight = 90;
            const photosPerRow = Math.floor(maxWidth / (photoWidth + 10));
            let photoX = margin;
            let photoY = currentY;

            for (let i = 0; i < beforeUrls.length; i++) {
              const imageData = detailImages[imageIndex++];
              
              if (imageData) {
                try {
                  doc.addImage(imageData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
                  
                  // Add photo number label
                  doc.setFontSize(8);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`${i + 1}`, photoX + photoWidth/2, photoY + photoHeight + 10, { align: 'center' });
                } catch (e) {
                  // If image fails, show placeholder
                  doc.setFillColor(240, 240, 240);
                  doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
                  doc.setFontSize(8);
                  doc.setTextColor(100, 100, 100);
                  doc.text('Foto tidak dapat dimuat', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                }
              }

              photoX += photoWidth + 10;
              if ((i + 1) % photosPerRow === 0 || i === beforeUrls.length - 1) {
                photoX = margin;
                photoY += photoHeight + 20;
              }
            }
            currentY = photoY + 10;
          } else {
            // Skip single before photos as they're already in main table
            imageIndex += beforeUrls.length;
          }

          // After photos section  
          if (afterUrls.length > 1) {
            // Check if we need a new page
            if (currentY > pageHeight - 200) {
              doc.addPage();
              currentY = 50;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`FOTO AFTER (${afterUrls.length} foto):`, margin, currentY);
            currentY += 15;

            // Calculate photo layout
            const photoWidth = 120;
            const photoHeight = 90;
            const photosPerRow = Math.floor(maxWidth / (photoWidth + 10));
            let photoX = margin;
            let photoY = currentY;

            for (let i = 0; i < afterUrls.length; i++) {
              const imageData = detailImages[imageIndex++];
              
              if (imageData) {
                try {
                  doc.addImage(imageData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
                  
                  // Add photo number label
                  doc.setFontSize(8);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`${i + 1}`, photoX + photoWidth/2, photoY + photoHeight + 10, { align: 'center' });
                } catch (e) {
                  // If image fails, show placeholder
                  doc.setFillColor(240, 240, 240);
                  doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
                  doc.setFontSize(8);
                  doc.setTextColor(100, 100, 100);
                  doc.text('Foto tidak dapat dimuat', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
                  doc.setTextColor(0, 0, 0);
                }
              }

              photoX += photoWidth + 10;
              if ((i + 1) % photosPerRow === 0 || i === afterUrls.length - 1) {
                photoX = margin;
                photoY += photoHeight + 20;
              }
            }
            currentY = photoY + 10;
          } else {
            // Skip single after photos as they're already in main table
            imageIndex += afterUrls.length;
          }

          // Add separator between findings
          currentY += 10;
          doc.setLineWidth(0.3);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 20;
        }
      }

      // Add footer with page numbers (recalculate after adding detail pages)
      const finalPageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Halaman ${i} dari ${finalPageCount}`,
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
      setPdfProgress({ step: 'Menyimpan PDF...', progress: 95 });
      doc.save(fileName);
      
      setPdfProgress({ step: 'PDF berhasil dibuat!', progress: 100 });
      toast.success('PDF berhasil diunduh! (Ukuran file dioptimasi)');
      
      // Log PDF download activity
      if (user) {
        logShipActivity(
          user,
          ACTIVITY_TYPES.DOWNLOAD,
          `Download laporan PDF kapal: ${selectedShip.ship_name} (${findings.length} temuan)`,
          selectedShip
        );
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Terjadi kesalahan saat membuat PDF');
      setPdfProgress({ step: 'Error!', progress: 0 });
    } finally {
      setTimeout(() => {
        setDownloadingPDF(false);
        setPdfProgress({ step: '', progress: 0 });
      }, 1000);
    }
  };

  // Photo display components
  const VesselCommentCell = ({ finding, role, onUpdateComment }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [comment, setComment] = useState(finding.vessel_comment || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      if (saving) return;
      setSaving(true);
      try {
        await onUpdateComment(finding.id, comment);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving comment:', error);
        toast.error('Gagal menyimpan komentar');
      } finally {
        setSaving(false);
      }
    };

    const handleCancel = () => {
      setComment(finding.vessel_comment || '');
      setIsEditing(false);
    };

    // Only users (not admin) can edit vessel comments
    const canEdit = role === 'user';

    if (!canEdit) {
      return (
        <div style={{ maxWidth: '200px', fontSize: '0.9rem' }}>
          {finding.vessel_comment ? (
            <span className="text-muted">{finding.vessel_comment}</span>
          ) : (
            <span className="text-muted fst-italic">Belum ada komentar</span>
          )}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div style={{ maxWidth: '200px' }}>
          <textarea
            className="form-control form-control-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
            placeholder="Tulis komentar dari kapal..."
            disabled={saving}
          />
          <div className="mt-1">
            <button
              className="btn btn-primary btn-sm me-1"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Simpan
                </>
              ) : (
                'Simpan'
              )}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
              disabled={saving}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              Batal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: '200px', fontSize: '0.9rem' }}>
        {finding.vessel_comment ? (
          <div>
            <span className="text-muted">{finding.vessel_comment}</span>
            <button
              className="btn btn-link btn-sm p-0 ms-1"
              onClick={() => setIsEditing(true)}
              title="Edit komentar"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-pencil"></i>
            </button>
          </div>
        ) : (
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
          >
            <i className="bi bi-plus"></i> Tambah Komentar
          </button>
        )}
      </div>
    );
  };

  const PhotoCell = ({ photoString, type, finding }) => {
    const photoCount = getPhotoCount(photoString);
    const firstPhotoUrl = getFirstPhotoUrl(photoString);

    if (photoCount === 0) {
      if (type === 'after') {
  return (
          <button className="btn btn-sm btn-primary" onClick={() => handleUploadAfterPhoto(finding)}>
            <i className="bi bi-camera me-1"></i>Add
          </button>
        );
      }
      return <span className="text-muted">-</span>;
    }

    if (photoCount === 1) {
      return (
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <img 
            src={firstPhotoUrl} 
            alt={type === 'before' ? 'Before' : 'After'} 
            style={{ 
              height: '170px', 
              width: '200px',
              objectFit: 'cover',
              borderRadius: '4px'
            }} 
            onClick={() => openPhotoGallery(photoString, type, finding, 0)}
          />
          {type === 'after' && (
            <div className="position-absolute top-0 end-0 m-1 d-flex flex-column gap-1">
              <button 
                className="btn btn-sm btn-warning"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadAfterPhoto(finding);
                }}
                title="Upload foto after tambahan"
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
              >
                <i className="bi bi-plus"></i>
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
          )}
        </div>
      );
    }

    // Multiple photos
    return (
      <div style={{ position: 'relative', cursor: 'pointer' }}>
        <img 
          src={firstPhotoUrl} 
          alt={`${type} 1 of ${photoCount}`} 
          style={{ 
            height: '170px', 
            width: '200px',
            objectFit: 'cover',
            borderRadius: '4px'
          }} 
          onClick={() => openPhotoGallery(photoString, type, finding, 0)}
        />
        <span 
          className="position-absolute top-0 start-0 badge bg-primary m-1"
          style={{ fontSize: '0.8rem' }}
        >
          {photoCount} foto
        </span>
        <button
          className="btn btn-link btn-sm position-absolute bottom-0 start-0 m-1 text-white"
          onClick={(e) => {
            e.stopPropagation();
            openPhotoGallery(photoString, type, finding, 0);
          }}
          style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          Lihat Semua
        </button>
        {type === 'after' && (
          <div className="position-absolute top-0 end-0 m-1 d-flex flex-column gap-1">
            <button 
              className="btn btn-sm btn-warning"
              onClick={(e) => {
                e.stopPropagation();
                handleUploadAfterPhoto(finding);
              }}
              title="Upload foto after tambahan"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              <i className="bi bi-plus"></i>
            </button>
            <button 
              className="btn btn-sm btn-danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAfterPhoto(finding);
              }}
              title="Hapus semua foto after"
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      </div>
    );
  };



  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <button className="btn btn-outline-secondary me-3" onClick={onBack}>
            <i className="bi bi-arrow-left me-2"></i>Kembali
          </button>
          <h2 className="d-inline">Detail Kapal: {selectedShip.ship_name}</h2>
        </div>
        <div>
          {role === 'admin' && (
            <button 
              className="btn btn-success me-2" 
              onClick={() => setShowAddForm(true)}
              disabled={loading}
            >
              <i className="bi bi-plus-lg me-2"></i>Tambah Temuan
            </button>
          )}
          <button 
            className="btn btn-info me-2" 
            onClick={handleDownloadPDF}
            disabled={loading || downloadingPDF}
          >
            {downloadingPDF ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                <div className="d-flex flex-column align-items-start">
                  <small>{pdfProgress.step}</small>
                  {pdfProgress.progress > 0 && (
                    <div className="progress" style={{ width: '100px', height: '4px' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${pdfProgress.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-pdf me-2"></i>Download PDF
              </>
            )}
          </button>
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
                    <th scope="col">Vessel Comment</th>
                    {role === 'admin' && <th scope="col" className="text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {findings.length > 0 ? (
                    findings.map((finding) => (
                      <React.Fragment key={finding.id}>
                        <tr>
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
                            <PhotoCell 
                              photoString={finding.before_photo} 
                              type="before" 
                              finding={finding}
                            />
                        </td>
                        <td>
                            <PhotoCell 
                              photoString={finding.after_photo} 
                              type="after" 
                              finding={finding}
                            />
                        </td>
                        <td>
                          <VesselCommentCell 
                            finding={finding}
                            role={role}
                            onUpdateComment={handleUpdateVesselComment}
                          />
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

                      </React.Fragment>
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
      


      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Foto After - Temuan #{selectedFinding?.no}</h5>
                <button type="button" className="btn-close" onClick={() => setShowUploadModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Pilih foto untuk diupload</label>
                  <input 
                    type="file" 
                    className="form-control" 
                    accept="image/*" 
                    multiple
                    onChange={handleAfterPhotosChange} 
                  />
                  <div className="form-text">
                    Format: JPG, PNG, GIF. Max: 5MB per file. Pilih multiple files dengan Ctrl/Cmd+Click
                  </div>
                </div>
                {afterPhotos.length > 0 && (
                  <div>
                    <h6>Preview ({afterPhotos.length} foto):</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {afterPhotos.map((photo, index) => (
                        <div key={index} className="text-center">
                          <img 
                            src={URL.createObjectURL(photo)} 
                            alt={`Preview ${index + 1}`} 
                            style={{ width: '80px', height: '60px', objectFit: 'cover' }}
                            className="img-thumbnail"
                          />
                          <small className="text-muted d-block">{index + 1}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Batal</button>
                <button 
                  className="btn btn-success" 
                  onClick={handleSubmitAfterPhoto} 
                  disabled={uploading || afterPhotos.length === 0}
                >
                  {uploading ? 'Uploading...' : `Upload ${afterPhotos.length} Foto`}
                </button>
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
                <h5 className="modal-title">Konfirmasi Hapus</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteAfterModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Apakah Anda yakin ingin menghapus SEMUA foto after untuk temuan #{findingToDeleteAfter?.no}?</p>
                <p className="text-muted small">
                  Total foto yang akan dihapus: {getPhotoCount(findingToDeleteAfter?.after_photo)}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteAfterModal(false)}>Batal</button>
                <button className="btn btn-danger" onClick={confirmDeleteAfterPhoto}>Hapus Semua</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <AddFindingForm
          selectedShip={selectedShip}
          onFindingAdded={handleFindingAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Photo Gallery Modal */}
      {photoGallery.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content bg-dark">
              <div className="modal-header border-secondary justify-content-between">
                <h5 className="modal-title text-white">{photoGallery.title}</h5>
                                 <div className="d-flex align-items-center ms-2">
                  <span className="text-white me-3">
                    {photoGallery.currentIndex + 1} dari {photoGallery.photos.length}
                  </span>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={closePhotoGallery}
                  ></button>
                </div>
              </div>
              <div className="modal-body p-0 position-relative d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
                {/* Previous Button */}
                {photoGallery.photos.length > 1 && (
                  <button
                    className="btn btn-dark position-absolute start-0 top-50 translate-middle-y ms-3"
                    style={{ zIndex: 10, opacity: 0.8 }}
                    onClick={prevPhoto}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.8}
                  >
                    <i className="bi bi-chevron-left fs-2 text-white"></i>
                  </button>
                )}

                {/* Main Image */}
                <img 
                  src={photoGallery.photos[photoGallery.currentIndex]} 
                  alt={`Foto ${photoGallery.currentIndex + 1}`}
                  className="img-fluid"
                  style={{ 
                    maxHeight: '70vh', 
                    maxWidth: '100%', 
                    objectFit: 'contain'
                  }}
                />

                {/* Next Button */}
                {photoGallery.photos.length > 1 && (
                  <button
                    className="btn btn-dark position-absolute end-0 top-50 translate-middle-y me-3"
                    style={{ zIndex: 10, opacity: 0.8 }}
                    onClick={nextPhoto}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.8}
                  >
                    <i className="bi bi-chevron-right fs-2 text-white"></i>
                  </button>
                )}
              </div>

              {/* Thumbnail Navigation */}
              {photoGallery.photos.length > 1 && (
                <div className="modal-footer border-secondary justify-content-center">
                  <div className="d-flex gap-2 flex-wrap justify-content-center" style={{ maxWidth: '100%', overflowX: 'auto' }}>
                    {photoGallery.photos.map((photo, index) => (
                      <button
                        key={index}
                        className={`btn p-0 border-2 ${index === photoGallery.currentIndex ? 'border-primary' : 'border-secondary'}`}
                        onClick={() => goToPhoto(index)}
                        style={{ width: '60px', height: '45px' }}
                      >
                        <img 
                          src={photo} 
                          alt={`Thumbnail ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '2px'
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyboard Navigation Instructions */}
              <div className="position-absolute bottom-0 start-0 m-3">
                <small className="text-muted">
                  <i className="bi bi-keyboard me-1"></i>
                  {photoGallery.photos.length > 1 
                    ? 'Panah ←→ navigasi • ESC tutup' 
                    : 'ESC untuk tutup'
                  }
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipDetails;
