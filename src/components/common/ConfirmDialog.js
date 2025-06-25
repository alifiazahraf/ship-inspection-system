import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({
  isOpen,
  title = "Konfirmasi",
  message,
  onConfirm,
  onCancel,
  confirmText = "Ya",
  cancelText = "Batal",
  confirmVariant = "danger",
  loading = false
}) => {
  const footer = (
    <>
      <button 
        type="button" 
        className="btn btn-secondary" 
        onClick={onCancel}
        disabled={loading}
      >
        {cancelText}
      </button>
      <button 
        type="button" 
        className={`btn btn-${confirmVariant}`}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Processing...
          </>
        ) : (
          confirmText
        )}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      size="md"
      loading={false}
      footer={footer}
      hideCloseButton={loading}
    >
      <p className="mb-0">{message}</p>
    </Modal>
  );
};

export default ConfirmDialog; 