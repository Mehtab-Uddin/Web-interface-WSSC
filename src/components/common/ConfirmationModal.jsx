import { Modal, Button } from 'react-bootstrap';

export default function ConfirmationModal({ 
  show, 
  onHide, 
  onConfirm, 
  title = 'Are you sure?',
  message,
  confirmText = 'OK',
  cancelText = 'Cancel'
}) {
  return (
    <Modal 
      show={show} 
      onHide={onHide}
      centered
      className="confirmation-modal"
    >
      <Modal.Body className="confirmation-modal-body">
        <p className="confirmation-message">{message || title}</p>
        <div className="confirmation-buttons">
          <Button 
            variant="primary" 
            onClick={onConfirm}
            className="confirmation-btn-ok"
          >
            {confirmText}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onHide}
            className="confirmation-btn-cancel"
          >
            {cancelText}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

