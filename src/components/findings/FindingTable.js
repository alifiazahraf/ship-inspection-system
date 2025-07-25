import React, { useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { getPhotoCount, getFirstPhotoUrl, parsePhotoUrls } from '../../utils/photoUtils';

const FindingTable = ({ 
  findings, 
  loading, 
  role = 'admin',
  onEdit,
  onDelete,
  onUploadAfter,
  onDeleteAfter,
  onImageClick,
  onUpdateComment
}) => {
  const [expandedPhotoRow, setExpandedPhotoRow] = useState(null);

  if (loading) {
    return <LoadingSpinner text="Memuat data temuan..." />;
  }

  if (findings.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-inbox display-1 text-muted"></i>
        <h5 className="mt-3 text-muted">Belum ada temuan</h5>
        <p className="text-muted">Data temuan inspeksi akan ditampilkan di sini</p>
      </div>
    );
  }

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
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => onUploadAfter && onUploadAfter(finding)}
            disabled={role !== 'admin'}
          >
            <i className="bi bi-cloud-upload"></i> Upload
          </button>
        );
      }
      return <span className="text-muted">Tidak ada</span>;
    }

    if (photoCount === 1) {
      return (
        <div className="d-flex flex-column align-items-center">
          <img 
            src={firstPhotoUrl} 
            alt={type === 'before' ? 'Before' : 'After'} 
            className="img-thumbnail"
            style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => onImageClick && onImageClick(firstPhotoUrl)}
          />
          {type === 'after' && role === 'admin' && (
            <button
              className="btn btn-outline-danger btn-sm mt-1"
              onClick={() => onDeleteAfter && onDeleteAfter(finding)}
              title="Hapus foto after"
            >
              <i className="bi bi-trash"></i>
            </button>
          )}
        </div>
      );
    }

    // Multiple photos
    return (
      <div className="d-flex flex-column align-items-center">
        <div className="position-relative">
          <img 
            src={firstPhotoUrl} 
            alt={`${type} 1 of ${photoCount}`} 
            className="img-thumbnail"
            style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => onImageClick && onImageClick(firstPhotoUrl)}
          />
          <span 
            className="position-absolute top-0 end-0 badge bg-primary rounded-pill"
            style={{ fontSize: '0.7rem', transform: 'translate(50%, -50%)' }}
          >
            +{photoCount - 1}
          </span>
        </div>
        <button
          className="btn btn-link btn-sm p-0 mt-1"
          onClick={() => setExpandedPhotoRow(
            expandedPhotoRow === `${finding.id}-${type}` ? null : `${finding.id}-${type}`
          )}
          style={{ fontSize: '0.8rem' }}
        >
          {expandedPhotoRow === `${finding.id}-${type}` ? 'Tutup' : `Lihat ${photoCount} foto`}
        </button>
        {type === 'after' && role === 'admin' && (
          <button
            className="btn btn-outline-danger btn-sm mt-1"
            onClick={() => onDeleteAfter && onDeleteAfter(finding)}
            title="Hapus semua foto after"
          >
            <i className="bi bi-trash"></i>
          </button>
        )}
      </div>
    );
  };

  const PhotoGallery = ({ photos, type }) => (
    <div className="d-flex flex-wrap gap-2 p-2 bg-light rounded">
      {photos.map((photoUrl, index) => (
        <div key={index} className="position-relative">
          <img 
            src={photoUrl}
            alt={`${type} ${index + 1}`}
            className="img-thumbnail"
            style={{ width: '60px', height: '45px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => onImageClick && onImageClick(photoUrl)}
          />
          <small className="text-muted d-block text-center" style={{ fontSize: '0.7rem' }}>
            {index + 1}
          </small>
        </div>
      ))}
    </div>
  );

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Temuan</th>
            <th>Kategori</th>
            <th>PIC Kapal</th>
            <th>PIC Kantor</th>
            <th>Status</th>
            <th>Foto Before</th>
            <th>Foto After</th>
            <th>Vessel Comment</th>
            {role === 'admin' && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <React.Fragment key={finding.id}>
              <tr>
                <td>{finding.no}</td>
                <td>{new Date(finding.date).toLocaleDateString('id-ID')}</td>
                <td style={{ maxWidth: '300px' }}>{finding.finding}</td>
                <td>
                  <span className="badge bg-secondary">{finding.category}</span>
                </td>
                <td>{finding.pic_ship}</td>
                <td>{finding.pic_office}</td>
                <td>
                  <span className={`badge ${finding.status === 'Open' ? 'bg-warning' : 'bg-success'}`}>
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
                    onUpdateComment={onUpdateComment}
                  />
                </td>
                {role === 'admin' && (
                  <td>
                    <div className="btn-group" role="group">
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => onEdit && onEdit(finding)}
                        title="Edit temuan"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onDelete && onDelete(finding)}
                        title="Hapus temuan"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              
              {/* Expanded photo gallery row */}
              {(expandedPhotoRow === `${finding.id}-before` || expandedPhotoRow === `${finding.id}-after`) && (
                <tr className="table-light">
                  <td colSpan={role === 'admin' ? 11 : 10}>
                    <div className="py-2">
                      {expandedPhotoRow === `${finding.id}-before` && (
                        <div>
                          <h6 className="mb-2">Foto Before (Temuan #{finding.no})</h6>
                          <PhotoGallery 
                            photos={parsePhotoUrls(finding.before_photo)} 
                            type="before"
                          />
                        </div>
                      )}
                      {expandedPhotoRow === `${finding.id}-after` && (
                        <div>
                          <h6 className="mb-2">Foto After (Temuan #{finding.no})</h6>
                          <PhotoGallery 
                            photos={parsePhotoUrls(finding.after_photo)} 
                            type="after"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FindingTable; 