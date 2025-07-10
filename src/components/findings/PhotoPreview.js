import React from 'react';
import { parsePhotoUrls } from '../../utils/photoUtils';

const PhotoPreview = ({ 
  photos = [], 
  existingPhotosString, 
  label = "Preview Foto",
  onRemovePhoto,
  onRemoveExistingPhoto
}) => {
  // Parse existing photos from database string
  const existingPhotos = parsePhotoUrls(existingPhotosString);
  
  // Combine new photos (File objects) and existing photos (URLs)
  const hasPhotos = photos.length > 0 || existingPhotos.length > 0;
  
  if (!hasPhotos) return null;

  const PhotoThumbnail = ({ src, isFile = false, fileName, fileSize, onRemove, index }) => (
    <div className="position-relative border rounded p-2 mb-2" style={{ width: '120px', height: '120px' }}>
      <img 
        src={src} 
        alt={`Preview ${index + 1}`} 
        className="img-fluid rounded w-100 h-100"
        style={{ objectFit: 'cover' }}
      />
      {onRemove && (
        <button
          type="button"
          className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
          onClick={() => onRemove(index)}
          title="Hapus foto"
        >
          <i className="bi bi-x"></i>
        </button>
      )}
      {isFile && (
        <small 
          className="text-muted d-block mt-1" 
          style={{ 
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}
          title={`${fileName} (${fileSize}MB)`}
        >
          ({fileSize}MB) {fileName}
        </small>
      )}
    </div>
  );

  return (
    <div className="mb-3">
      <label className="form-label">{label}:</label>
      <div className="d-flex flex-wrap gap-2">
        {/* Display existing photos */}
        {existingPhotos.map((photoUrl, index) => (
          <PhotoThumbnail
            key={`existing-${index}`}
            src={photoUrl}
            index={index}
            onRemove={onRemoveExistingPhoto ? (idx) => onRemoveExistingPhoto(photoUrl) : null}
        />
        ))}
        
        {/* Display new photos */}
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={`new-${index}`}
            src={URL.createObjectURL(photo)}
            isFile={true}
            fileName={photo.name}
            fileSize={(photo.size / 1024 / 1024).toFixed(2)}
            index={index}
            onRemove={onRemovePhoto}
          />
        ))}
      </div>
      
      {/* Photo count info */}
      <small className="text-muted d-block mt-2">
        Total: {existingPhotos.length + photos.length} foto
        {existingPhotos.length > 0 && ` (${existingPhotos.length} tersimpan, ${photos.length} baru)`}
      </small>
    </div>
  );
};

export default PhotoPreview; 