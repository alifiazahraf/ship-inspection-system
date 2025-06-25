import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Modal = ({ 
  isOpen, 
  title, 
  children, 
  onClose, 
  size = 'lg',
  loading = false,
  hideCloseButton = false,
  footer
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className={`modal-dialog modal-${size}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            {!hideCloseButton && (
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose} 
                disabled={loading}
              ></button>
            )}
          </div>
          
          <div className="modal-body">
            {loading ? (
              <LoadingSpinner text="Please wait..." />
            ) : (
              children
            )}
          </div>

          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 