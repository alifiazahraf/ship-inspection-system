import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import PhotoPreview from './PhotoPreview';
import { 
  FINDING_CATEGORIES, 
  FINDING_STATUSES, 
  PIC_SHIP_OPTIONS, 
  PIC_OFFICE_OPTIONS,
  DEFAULT_CATEGORY,
  DEFAULT_STATUS
} from '../../constants/findingData';
import { 
  uploadMultiplePhotos, 
  serializePhotoUrls, 
  parsePhotoUrls,
  removePhotoUrl,
  deletePhotosFromStorage
} from '../../utils/photoUtils';

const FindingForm = ({ 
  mode = 'add', // 'add' or 'edit'
  finding = null,
  selectedShip = null,
  onSuccess,
  onCancel,
  loading: externalLoading = false
}) => {
  const [formData, setFormData] = useState({
    finding: '',
    picShip: '',
    picOffice: '',
    category: DEFAULT_CATEGORY,
    status: DEFAULT_STATUS,
    date: new Date().toISOString().split('T')[0]
  });
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Photo deletion confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    photoUrl: '',
    type: '', // 'before' or 'after'
    photoIndex: -1,
    deleting: false
  });

  useEffect(() => {
    if (mode === 'edit' && finding) {
      setFormData({
        finding: finding.finding || '',
        picShip: finding.pic_ship || '',
        picOffice: finding.pic_office || '',
        category: finding.category || DEFAULT_CATEGORY,
        status: finding.status || DEFAULT_STATUS,
        date: finding.date ? finding.date.split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }
  }, [mode, finding]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBeforePhotosChange = (e) => {
    const files = Array.from(e.target.files);
    setBeforePhotos(prev => [...prev, ...files]);
  };

  const handleAfterPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    setAfterPhotos(prev => [...prev, ...files]);
  };

  const removeBeforePhoto = (index) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeAfterPhoto = (index) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Confirmation dialog handlers
  const showDeleteConfirmation = (photoUrl, type, photoIndex) => {
    setDeleteConfirmation({
      isOpen: true,
      photoUrl: photoUrl,
      type: type,
      photoIndex: photoIndex
    });
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      photoUrl: '',
      type: '',
      photoIndex: -1,
      deleting: false
    });
  };

  const confirmPhotoDelete = async () => {
    setDeleteConfirmation(prev => ({ ...prev, deleting: true }));
    
    const { photoUrl, type } = deleteConfirmation;
    try {
      if (type === 'before') {
        await executeRemoveExistingBeforePhoto(photoUrl);
      } else if (type === 'after') {
        await executeRemoveExistingAfterPhoto(photoUrl);
      }
    } finally {
      hideDeleteConfirmation();
    }
  };

  const executeRemoveExistingBeforePhoto = async (photoUrl) => {
    if (mode !== 'edit' || !finding) return;
    
    try {
      const updatedPhotos = removePhotoUrl(finding.before_photo, photoUrl);
      
      // Update database
      const { error } = await supabase
        .from('findings')
        .update({ before_photo: updatedPhotos })
        .eq('id', finding.id);
      
      if (error) throw error;
      
      // Delete from storage
      await deletePhotosFromStorage([photoUrl], supabase);
      
      // Update local finding object
      finding.before_photo = updatedPhotos;
      
      toast.success('Foto before berhasil dihapus');
      
      // Refresh form to show updated photo list
      setTimeout(() => {
        onSuccess();
      }, 1000); // Small delay to show success message
      
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Gagal menghapus foto: ' + error.message);
    }
  };

  const executeRemoveExistingAfterPhoto = async (photoUrl) => {
    if (mode !== 'edit' || !finding) return;
    
    try {
      const updatedPhotos = removePhotoUrl(finding.after_photo, photoUrl);
      
      // Update database
      const { error } = await supabase
        .from('findings')
        .update({ after_photo: updatedPhotos })
        .eq('id', finding.id);
      
      if (error) throw error;
      
      // Delete from storage
      await deletePhotosFromStorage([photoUrl], supabase);
      
      // Update local finding object
      finding.after_photo = updatedPhotos;
      
      toast.success('Foto after berhasil dihapus');
      
      // Refresh form to show updated photo list
      setTimeout(() => {
        onSuccess();
      }, 1000); // Small delay to show success message
      
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Gagal menghapus foto: ' + error.message);
    }
  };

  // Wrapper functions that show confirmation dialog
  const removeExistingBeforePhoto = (photoUrl) => {
    const photoIndex = parsePhotoUrls(finding.before_photo).indexOf(photoUrl) + 1;
    showDeleteConfirmation(photoUrl, 'before', photoIndex);
  };

  const removeExistingAfterPhoto = (photoUrl) => {
    const photoIndex = parsePhotoUrls(finding.after_photo).indexOf(photoUrl) + 1;
    showDeleteConfirmation(photoUrl, 'after', photoIndex);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let beforePhotoUrls = [];
      let afterPhotoUrls = [];

      // Upload new before photos if exist
      if (beforePhotos.length > 0) {
        const shipId = mode === 'edit' ? finding.ship_id : selectedShip.id;
        beforePhotoUrls = await uploadMultiplePhotos(beforePhotos, shipId, 'before', supabase);
      }

      // Upload new after photos if exist (only in edit mode)
      if (mode === 'edit' && afterPhotos.length > 0) {
        afterPhotoUrls = await uploadMultiplePhotos(afterPhotos, finding.ship_id, 'after', supabase);
      }

      if (mode === 'add') {
        // Get the latest finding number for this ship
        const { data: latestFinding, error: countError } = await supabase
          .from('findings')
          .select('no')
          .eq('ship_id', selectedShip.id)
          .order('no', { ascending: false })
          .limit(1);

        if (countError) throw countError;

        const nextNo = latestFinding && latestFinding.length > 0 ? latestFinding[0].no + 1 : 1;

        const { error } = await supabase
          .from('findings')
          .insert([{
            ship_id: selectedShip.id,
            no: nextNo,
            finding: formData.finding,
            category: formData.category,
            status: formData.status,
            date: formData.date,
            pic_ship: formData.picShip,
            pic_office: formData.picOffice,
            before_photo: serializePhotoUrls(beforePhotoUrls),
            after_photo: '', // Empty for new findings
            created_by: 'admin'
          }]);

        if (error) throw error;
        toast.success('Temuan berhasil ditambahkan!');
      } else {
        // Edit mode - combine existing photos with new ones
        const existingBeforeUrls = parsePhotoUrls(finding.before_photo);
        const existingAfterUrls = parsePhotoUrls(finding.after_photo);
        
        const allBeforeUrls = [...existingBeforeUrls, ...beforePhotoUrls];
        const allAfterUrls = [...existingAfterUrls, ...afterPhotoUrls];

        const { error } = await supabase
          .from('findings')
          .update({
            finding: formData.finding,
            category: formData.category,
            status: formData.status,
            date: formData.date,
            pic_ship: formData.picShip,
            pic_office: formData.picOffice,
            before_photo: serializePhotoUrls(allBeforeUrls),
            after_photo: serializePhotoUrls(allAfterUrls)
          })
          .eq('id', finding.id);

        if (error) throw error;
        toast.success('Temuan berhasil diupdate!');
      }

      onSuccess();
    } catch (error) {
      setError('Error: ' + error.message);
      toast.error('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormLoading = loading || externalLoading;

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="row">
        <div className="col-md-4">
          <FormInput
            label="Tanggal Temuan"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            max={new Date().toISOString().split('T')[0]}
            required
            disabled={isFormLoading}
          />
        </div>
        <div className="col-md-4">
          <FormSelect
            label="Kategori Temuan"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            options={FINDING_CATEGORIES}
            required
            disabled={isFormLoading}
          />
        </div>
        <div className="col-md-4">
          <FormSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={FINDING_STATUSES}
            required
            disabled={isFormLoading}
          />
        </div>
      </div>

      <div className="row">
        <div className={mode === 'add' ? 'col-12' : 'col-md-6'}>
          <FormInput
            label="Foto Before"
            type="file"
            accept="image/*"
            multiple
            onChange={handleBeforePhotosChange}
            disabled={isFormLoading}
            helpText="Format: JPG, PNG, GIF. Max: 5MB per file. Pilih multiple files dengan Ctrl/Cmd+Click"
          />
        </div>
        {mode === 'edit' && (
          <div className="col-md-6">
            <FormInput
              label="Foto After"
              type="file"
              accept="image/*"
              multiple
              onChange={handleAfterPhotosChange}
              disabled={isFormLoading}
              helpText="Format: JPG, PNG, GIF. Max: 5MB per file. Pilih multiple files dengan Ctrl/Cmd+Click"
            />
          </div>
        )}
      </div>

      <PhotoPreview 
        photos={beforePhotos}
        existingPhotosString={mode === 'edit' ? finding?.before_photo : null}
        label="Preview Foto Before"
        onRemovePhoto={removeBeforePhoto}
        onRemoveExistingPhoto={removeExistingBeforePhoto}
      />

      {mode === 'edit' && (
        <PhotoPreview 
          photos={afterPhotos}
          existingPhotosString={finding?.after_photo}
          label="Preview Foto After"
          onRemovePhoto={removeAfterPhoto}
          onRemoveExistingPhoto={removeExistingAfterPhoto}
        />
      )}

      <FormInput
        label="Deskripsi Temuan"
        type="textarea"
        name="finding"
        rows={4}
        value={formData.finding}
        onChange={handleInputChange}
        required
        placeholder="Deskripsikan temuan inspeksi secara detail..."
        disabled={isFormLoading}
      />

      <div className="row">
        <div className="col-md-6">
          <FormSelect
            label="PIC Kapal"
            name="picShip"
            value={formData.picShip}
            onChange={handleInputChange}
            options={PIC_SHIP_OPTIONS}
            placeholder="Pilih PIC Kapal"
            required
            disabled={isFormLoading}
          />
        </div>
        <div className="col-md-6">
          <FormSelect
            label="PIC Kantor"
            name="picOffice"
            value={formData.picOffice}
            onChange={handleInputChange}
            options={PIC_OFFICE_OPTIONS}
            placeholder="Pilih PIC Kantor"
            required
            disabled={isFormLoading}
          />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isFormLoading}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={isFormLoading || !formData.finding.trim()}>
          {isFormLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Menyimpan...
            </>
          ) : (
            mode === 'add' ? 'Simpan' : 'Simpan Perubahan'
          )}
        </button>
      </div>

      {/* Photo Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Konfirmasi Hapus Foto
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={hideDeleteConfirmation}
                  disabled={deleteConfirmation.deleting}
                ></button>
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-start">
                  <div className="flex-shrink-0 me-3">
                    <img 
                      src={deleteConfirmation.photoUrl} 
                      alt="Preview"
                      style={{ 
                        width: '80px', 
                        height: '60px', 
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                      className="border"
                    />
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-2">
                      Apakah Anda yakin ingin menghapus <strong>foto {deleteConfirmation.type}</strong> nomor <strong>{deleteConfirmation.photoIndex}</strong>?
                    </p>
                    <div className="alert alert-warning py-2 mb-0">
                      <small>
                        <i className="bi bi-info-circle me-1"></i>
                        Foto yang sudah dihapus tidak dapat dikembalikan.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
                             <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={hideDeleteConfirmation}
                  disabled={deleteConfirmation.deleting}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmPhotoDelete}
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
                      Ya, Hapus Foto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default FindingForm; 