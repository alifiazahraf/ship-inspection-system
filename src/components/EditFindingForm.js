import React from 'react';
import { Modal } from './common';
import { FindingForm } from './findings';

const EditFindingForm = ({ finding, onFindingEdited, onCancel }) => {
  return (
    <Modal
      isOpen={true}
      title={`Edit Temuan #${finding.no}`}
      onClose={onCancel}
      size="lg"
    >
      <FindingForm
        mode="edit"
        finding={finding}
        onSuccess={onFindingEdited}
        onCancel={onCancel}
      />
    </Modal>
  );
};

export default EditFindingForm; 