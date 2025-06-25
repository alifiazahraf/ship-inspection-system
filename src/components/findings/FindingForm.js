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
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && finding) {
      setFormData({
        finding: finding.finding,
        picShip: finding.pic_ship,
        picOffice: finding.pic_office,
        category: finding.category,
        status: finding.status,
        date: finding.date.split('T')[0]
      });
    }
  }, [mode, finding]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const uploadPhoto = async (file) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const shipId = mode === 'edit' ? finding.ship_id : selectedShip.id;
    const fileName = `${shipId}/before_${Date.now()}.${fileExt}`;
    const filePath = `findings/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('finding-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('finding-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let beforePhotoUrl = mode === 'edit' ? finding.before_photo : null;
      if (beforePhoto) {
        beforePhotoUrl = await uploadPhoto(beforePhoto);
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
            before_photo: beforePhotoUrl,
            created_by: 'admin'
          }]);

        if (error) throw error;
        toast.success('Temuan berhasil ditambahkan!');
      } else {
        // Edit mode
        const { error } = await supabase
          .from('findings')
          .update({
            finding: formData.finding,
            category: formData.category,
            status: formData.status,
            date: formData.date,
            pic_ship: formData.picShip,
            pic_office: formData.picOffice,
            before_photo: beforePhotoUrl
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

      <FormInput
        label="Foto Before"
        type="file"
        accept="image/*"
        onChange={(e) => setBeforePhoto(e.target.files[0])}
        disabled={isFormLoading}
        helpText="Format: JPG, PNG, GIF. Max: 5MB"
      />

      <PhotoPreview 
        photo={beforePhoto} 
        existingPhotoUrl={mode === 'edit' ? finding?.before_photo : null}
        label="Preview Foto Before"
      />

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
    </form>
  );
};

export default FindingForm; 