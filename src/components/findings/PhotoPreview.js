import React from 'react';

const PhotoPreview = ({ photo, existingPhotoUrl, label = "Preview Foto" }) => {
  if (!photo && !existingPhotoUrl) return null;

  const imageUrl = photo ? URL.createObjectURL(photo) : existingPhotoUrl;

  return (
    <div className="mb-3">
      <label className="form-label">{label}:</label>
      <div className="border rounded p-2">
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="img-fluid rounded"
          style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
        />
        {photo && (
          <small className="text-muted d-block mt-1">
            File: {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
          </small>
        )}
      </div>
    </div>
  );
};

export default PhotoPreview; 