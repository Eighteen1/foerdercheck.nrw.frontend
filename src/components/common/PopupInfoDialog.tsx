import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface PopupInfoDialogProps {
  show: boolean;
  onHide: () => void;
}

const PopupInfoDialog: React.FC<PopupInfoDialogProps> = ({
  show,
  onHide
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="text-[#064497]">
          Validierungsseite geöffnet
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="mb-3">
          <p className="mb-3">
            Die Validierungsseite wurde in einem neuen Tab geöffnet. 
            Falls Sie die Seite nicht sehen können, wurde sie möglicherweise von Ihrem Browser als Popup blockiert.
          </p>
          
          <div className="alert alert-info">
            <strong>Was Sie tun können:</strong>
            <ul className="mb-0 mt-2">
              <li>Prüfen Sie, ob ein neuer Tab geöffnet wurde</li>
              <li>Suchen Sie nach einer Popup-Blockierung in Ihrem Browser</li>
              <li>Erlauben Sie Popups für diese Website, falls nötig</li>
              <li>Versuchen Sie es erneut, falls die Seite nicht sichtbar ist</li>
            </ul>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button 
          variant="primary" 
          onClick={onHide}
          style={{ backgroundColor: '#064497', borderColor: '#064497' }}
        >
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PopupInfoDialog;
