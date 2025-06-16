import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AddFindingForm from './AddFindingForm';
import EditFindingForm from './EditFindingForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ShipDetails = ({ selectedShip, onBack, showAddForm, setShowAddForm, role = 'admin' }) => {
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
  };

  const handleEditFinding = (finding) => {
    setSelectedFinding(finding);
    setShowEditForm(true);
  };

  const handleFindingEdited = async () => {
    setShowEditForm(false);
    await fetchShipData();
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
              <p className="fw-bold fs-5 mb-0">{new Date(selectedShip.last_inspection).toLocaleDateString()}</p>
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
                        <td>
                          <div className="fw-medium">{finding.finding}</div>
                          <small className="text-muted">{finding.category} | PIC: {finding.pic_ship} / {finding.pic_office}</small>
                        </td>
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
                            <div style={{ cursor: 'pointer' }} onClick={() => setSelectedImage(finding.after_photo)}>
                              <img 
                                src={finding.after_photo} 
                                alt="After" 
                                style={{ 
                                  height: '170px', 
                                  width: '200px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }} 
                              />
                            </div>
                          ) : (
                            role === 'user' ? (
                              <button className="btn btn-sm btn-primary" onClick={() => handleUploadAfterPhoto(finding)}>
                                <i className="bi bi-camera me-1"></i>Add
                              </button>
                            ) : <span className="text-muted">-</span>
                          )}
                        </td>
                        {role === 'admin' && (
                          <td className="text-center">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEditFinding(finding)}
                            >
                              <i className="bi bi-pencil me-1"></i>
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
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
    </>
  );
};

export default ShipDetails;
