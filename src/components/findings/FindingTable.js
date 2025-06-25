import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const FindingTable = ({ 
  findings, 
  loading, 
  role = 'admin',
  onEdit,
  onDelete,
  onUploadAfter,
  onDeleteAfter,
  onImageClick
}) => {
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
            {role === 'admin' && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr key={finding.id}>
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
                {finding.before_photo ? (
                  <img 
                    src={finding.before_photo} 
                    alt="Before" 
                    className="img-thumbnail"
                    style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => onImageClick && onImageClick(finding.before_photo)}
                  />
                ) : (
                  <span className="text-muted">Tidak ada</span>
                )}
              </td>
              <td>
                {finding.after_photo ? (
                  <div className="d-flex flex-column align-items-center">
                    <img 
                      src={finding.after_photo} 
                      alt="After" 
                      className="img-thumbnail mb-1"
                      style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => onImageClick && onImageClick(finding.after_photo)}
                    />
                    {role === 'admin' && (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onDeleteAfter && onDeleteAfter(finding)}
                        title="Hapus foto after"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => onUploadAfter && onUploadAfter(finding)}
                    disabled={role !== 'admin'}
                  >
                    <i className="bi bi-cloud-upload"></i> Upload
                  </button>
                )}
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FindingTable; 